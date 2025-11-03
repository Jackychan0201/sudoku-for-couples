// src/app/room/[code]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '@/lib/api';
import { getPusher } from '@/lib/pusher';
import { SudokuGrid } from '@/components/ui/SudokuGrid';
import { useRef } from 'react';
import { ValidationModal } from '@/components/ui/ValidationModal';

type Room = {
  roomCode: string;
  mode: 'together' | 'competitive';
  difficulty: string;
  puzzle: (number | null)[][];
  status: string;
};

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState(0);
  const [myGrid, setMyGrid] = useState<(number | null)[][]>([]);
  const clientId = useRef<string>(Math.random().toString(36).substring(2, 9));
  const [playerLabels, setPlayerLabels] = useState<Record<string, string>>({});
  const roomRef = useRef<Room | null>(null);

  const channelName = `presence-room-${code}`;
  const canEdit = room?.status === 'started';
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [waitingForOther, setWaitingForOther] = useState<string | null>(null);
  const hasSubmittedRef = useRef(hasSubmitted);

  // keep ref in sync so pusher handlers see latest value
  useEffect(() => {
    hasSubmittedRef.current = hasSubmitted;
  }, [hasSubmitted]);

  // keep a ref of the latest room so pusher handlers can read mode without
  // rebinding handlers (we intentionally avoid re-subscribing repeatedly)
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // helper: create stable Player 1 / Player 2 labels from a set of client ids.
  // We sort the ids to make labeling deterministic across clients.
  const recomputeLabels = (ids: string[]) => {
    const sorted = [...ids].sort();
    const map: Record<string, string> = {};
    for (let i = 0; i < sorted.length; i++) {
      map[sorted[i]] = `Player ${i + 1}`;
    }
    setPlayerLabels(map);
    return map;
  };

  const getPlayerLabel = (id?: string) => {
    if (!id) return 'Player';
    // If we already have a mapping, return it
    if (playerLabels[id]) return playerLabels[id];

    // Fallback: if mapping is empty, attempt to derive a deterministic
    // two-player mapping using the current clientId and the provided id.
    // We sort the two ids so both clients compute the same Player 1/2 mapping.
    try {
      const known = Object.keys(playerLabels);
      if (known.length === 0 && id && clientId.current) {
        const ids = [clientId.current, id].filter(Boolean).sort();
        const map = recomputeLabels(ids);
        return map[id] ?? `Player`;
      }
    } catch (e) {
      // ignore and fallthrough
    }

    return `Player`;
  };

  const validateGrid = () => {
    const grid = myGrid;

    // require completeness before validating
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] == null) {
          toast.error('Grid incomplete — fill all cells before validating');
          return;
        }
      }
    }

    // mark as submitted locally and send validation request to server which will coordinate and broadcast results
    setHasSubmitted(true);
    setWaitingForOther('Waiting for the other player\'s response');

    (async () => {
      try {
        await api.post(`/rooms/${code}/validate`, {
          clientId: clientId.current,
          name: clientId.current,
          grid,
        });
        // server will broadcast 'player-finished' to others, and 'show-validation' when ready
      } catch (err) {
        console.warn('Validation request failed', err);
        toast.error('Validation failed (network)');
        setHasSubmitted(false);
        setWaitingForOther(null);
      }
    })();
  };

  // validation state & opponent finished prompt
  const [validationData, setValidationData] = useState<any | null>(null);
  const [opponentFinished, setOpponentFinished] = useState<any | null>(null);
  const router = useRouter();

  // -----------------------------------------------------------------
  // 1. Fetch room + init grid (only on mount / code change)
  // -----------------------------------------------------------------
  // NOTE: do NOT re-run this when `hasSubmitted` changes or when room.mode
  // toggles — doing so caused the user's current grid to be reset back to
  // the original puzzle after validation. We only want to initialise the
  // client's grid when the room is first loaded or the room code changes.
  useEffect(() => {
    api.get(`/rooms/${code}`).then(res => {
      setRoom(res.data);
      setMyGrid(JSON.parse(JSON.stringify(res.data.puzzle)));
    }).catch(() => toast.error('Room not found'));
  }, [code]);

  // -----------------------------------------------------------------
  // 2. Pusher presence + events
  // -----------------------------------------------------------------
  useEffect(() => {
    const pusher = getPusher();
    const channel = pusher.subscribe(channelName);

    channel.bind('pusher:subscription_succeeded', (members: any) => {
      const count = members.count ?? 0;
      setPlayers(count);
      // build labels from current members
      try {
        // members.members may exist (object keyed by id) or members.each may be provided
        let ids: string[] = [];
        if (members?.members && typeof members.members === 'object') {
          ids = Object.keys(members.members);
        } else if (typeof members.each === 'function') {
          const tmp: string[] = [];
          members.each((m: any) => tmp.push(m.id));
          ids = tmp;
        }
        recomputeLabels(ids);
      } catch (e) {
        // ignore
      }
    });

    channel.bind('pusher:member_added', (member: any) => {
      setPlayers(p => p + 1);
      // recompute labels by combining known ids + the new one
      let newMap: Record<string, string> | undefined;
      try {
        const ids = Object.keys(playerLabels).concat(member.id).filter(Boolean);
        newMap = recomputeLabels(ids);
      } catch (e) {
        // ignore
      }
      // use the freshly computed label when possible
      const label = newMap?.[member.id] ?? playerLabels[member.id] ?? `Player`;
      toast.info(`${label} joined`);
    });

    channel.bind('pusher:member_removed', (member: any) => {
      setPlayers(p => Math.max(0, p - 1));
      try {
        // capture the label for the leaving member before removing it; if missing,
        // compute a fallback label so toasts read "Player 1 left" instead of "Player left".
        const leavingLabel = getPlayerLabel(member.id) ?? 'Player';
        const ids = Object.keys(playerLabels).filter(id => id !== member.id);
        recomputeLabels(ids);
        toast.info(`${leavingLabel} left`);
      } catch (e) {
        // ignore
        toast.info(`A player left`);
      }
    });

    channel.bind('game-started', () => {
      // update local room status so UI becomes editable
      setRoom(prev => prev ? { ...prev, status: 'started' } : prev);
      toast.success('Game started!', { description: 'Good luck!' });
    });

    channel.bind('show-validation', (payload: any) => {
      // reset submit/waiting state when final results are shown
      setHasSubmitted(false);
      setWaitingForOther(null);
      setOpponentFinished(null);
      try {
        // map submission names to Player 1/2 labels so we never show raw ids
        const subs = (payload?.submissions ?? []).map((s: any) => ({
          ...s,
          name: getPlayerLabel(s.clientId) || s.name || undefined,
        }));
        setValidationData({ ...payload, submissions: subs });
      } catch (e) {
        setValidationData(payload);
      }
    });

    channel.bind('player-finished', (payload: any) => {
      // if the finished player is this client, ignore
      if (payload?.clientId === clientId.current) return;
      // store payload but we'll render using computed labels
      setOpponentFinished(payload);
    });

    channel.bind('player-continue', (payload: any) => {
      // if we are the one who already submitted, show waiting for other to finish
      if (hasSubmittedRef.current && payload?.clientId !== clientId.current) {
        setWaitingForOther('Waiting for the other player to finish solving');
      }
    });

    // Listen for cell updates from other players
    channel.bind('cell-updated', (payload: any) => {
      try {
        // only apply incoming updates in together mode
        if (roomRef.current?.mode !== 'together') return;
        if (!payload) return;
        // Ignore events originating from this client
        if (payload.clientId && payload.clientId === clientId.current) return;

        const { r, c, value } = payload;
        if (typeof r !== 'number' || typeof c !== 'number') return;

        setMyGrid(prev => {
          const next = prev.map(row => [...row]);
          next[r][c] = value;
          return next;
        });
      } catch (e) {
        // ignore
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [code]);

  // -----------------------------------------------------------------
  // 3. Start game
  // -----------------------------------------------------------------
  const startGame = async () => {
    try {
      await api.patch(`/rooms/${code}/start`);
    } catch {
      toast.error('Failed to start');
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading room...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 to-pink-50 p-4">
      <Card className="max-w-4xl mx-auto shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            Room: <span className="font-mono text-indigo-600">{code}</span>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Mode: <strong className="capitalize">{room.mode}</strong> | 
            Players: <strong>{players}/2</strong>
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Start + Validate Buttons */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={startGame}
              disabled={players < 2 || room.status === 'started'}
              size="lg"
              className="min-w-[200px]"
            >
              {room.status === 'started' ? 'Started' : players < 2 ? 'Waiting for player...' : 'Start Game'}
            </Button>

              <Button
                onClick={validateGrid}
                disabled={!canEdit || hasSubmitted}
                size="lg"
                variant="secondary"
              >
                {hasSubmitted ? 'Waiting...' : 'Validate'}
              </Button>
          </div>

          {/* Waiting message when first player has submitted */}
          {waitingForOther && (
            <div className="flex justify-center">
              <div className="bg-yellow-50 border border-yellow-300 px-4 py-2 rounded mb-4">
                {waitingForOther}
              </div>
            </div>
          )}

          {/* Sudoku Grid */}
          <div className="flex justify-center p-4 bg-white rounded-lg shadow-inner">
            <SudokuGrid
              grid={myGrid}
              initial={room.puzzle}
              readOnly={!canEdit}
              onChange={(r, c, value) => {
                // Update locally first
                setMyGrid(prev => {
                  const next = prev.map(row => [...row]);
                  next[r][c] = value;
                  return next;
                });

                // Broadcast the change via server so others see it
                // Only broadcast in together mode — competitive players should not see each other's inputs
                if (room?.mode === 'together') {
                  (async () => {
                    try {
                      await api.post('/pusher/trigger', {
                        channel: channelName,
                        event: 'cell-updated',
                        data: { r, c, value, clientId: clientId.current },
                      });
                    } catch (err) {
                      console.warn('Failed to broadcast cell update', err);
                    }
                  })();
                }
              }}
            />
          </div>
            {opponentFinished && (
              <div className="fixed bottom-6 right-6 bg-yellow-50 border border-yellow-300 p-4 rounded shadow">
                <div className="mb-2">{getPlayerLabel(opponentFinished.clientId) ?? 'A player'} finished the puzzle.</div>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      // continue solving: inform other player and close prompt
                      try {
                        await api.post('/pusher/trigger', {
                          channel: channelName,
                          event: 'player-continue',
                          data: { clientId: clientId.current, name: clientId.current },
                        });
                      } catch (err) {
                        console.warn('Failed to notify continue', err);
                      }
                      setOpponentFinished(null);
                    }}
                    variant="ghost"
                  >
                    Continue solving
                  </Button>
                  <Button
                    onClick={async () => {
                      // validate instantly: submit current grid
                      try {
                        setHasSubmitted(true);
                        setWaitingForOther('Waiting for the other player\'s response');
                        await api.post(`/rooms/${code}/validate`, {
                          clientId: clientId.current,
                          name: clientId.current,
                          grid: myGrid,
                        });
                      } catch (err) {
                        console.warn('Instant validate failed', err);
                        setHasSubmitted(false);
                        setWaitingForOther(null);
                      } finally {
                        setOpponentFinished(null);
                      }
                    }}
                  >
                    Validate now
                  </Button>
                </div>
              </div>
            )}

          <ValidationModal
            open={!!validationData}
            onClose={() => setValidationData(null)}
            onEnd={() => {
              // navigate out of the room (end game)
              router.push('/');
            }}
            mode={validationData?.mode}
            solution={validationData?.solution}
            submissions={validationData?.submissions ?? []}
            playerLabels={playerLabels}
          />
        </CardContent>
      </Card>
    </div>
  );
}