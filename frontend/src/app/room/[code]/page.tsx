// src/app/room/[code]/page.tsx
'use client';

import { useEffect, useState } from 'react';
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

  const channelName = `presence-room-${code}`;
  const canEdit = room?.status === 'started';

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

    // send validation request to server which will coordinate and broadcast results
    (async () => {
      try {
        await api.post(`/rooms/${code}/validate`, {
          clientId: clientId.current,
          name: clientId.current,
          grid,
        });
        // server will broadcast 'show-validation' which we listen for
      } catch (err) {
        console.warn('Validation request failed', err);
        toast.error('Validation failed (network)');
      }
    })();
  };

  // validation state & opponent finished prompt
  const [validationData, setValidationData] = useState<any | null>(null);
  const [opponentFinished, setOpponentFinished] = useState<any | null>(null);

  // -----------------------------------------------------------------
  // 1. Fetch room + init grid
  // -----------------------------------------------------------------
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
    });

    channel.bind('pusher:member_added', (member: any) => {
      setPlayers(p => p + 1);
      toast.info(`${member.info.name ?? 'A player'} joined`);
    });

    channel.bind('pusher:member_removed', (member: any) => {
      setPlayers(p => Math.max(0, p - 1));
      toast.info(`${member.info.name ?? 'A player'} left`);
    });

    channel.bind('game-started', () => {
      // update local room status so UI becomes editable
      setRoom(prev => prev ? { ...prev, status: 'started' } : prev);
      toast.success('Game started!', { description: 'Good luck!' });
    });

    channel.bind('show-validation', (payload: any) => {
      setValidationData(payload);
    });

    channel.bind('player-finished', (payload: any) => {
      // if the finished player is this client, ignore
      if (payload?.clientId === clientId.current) return;
      setOpponentFinished(payload);
    });

    // Listen for cell updates from other players
    channel.bind('cell-updated', (payload: any) => {
      try {
        // only apply incoming updates in together mode
        if (room?.mode !== 'together') return;
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-pink-50 p-4">
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
              disabled={!canEdit}
              size="lg"
              variant="secondary"
            >
              Validate
            </Button>
          </div>

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
              <div className="mb-2">{opponentFinished.name ?? 'A player'} finished the puzzle.</div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    // continue solving: just close prompt
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
                      await api.post(`/rooms/${code}/validate`, {
                        clientId: clientId.current,
                        name: clientId.current,
                        grid: myGrid,
                      });
                    } catch (err) {
                      console.warn('Instant validate failed', err);
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
            mode={validationData?.mode}
            solution={validationData?.solution}
            submissions={validationData?.submissions ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}