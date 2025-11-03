'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function Home() {
  const [mode, setMode] = useState<'together' | 'competitive'>('competitive');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const createRoom = async () => {
    setLoading(true);
    try {
      const res = await api.post('/rooms/create', { mode, difficulty });
      router.push(`/room/${res.data.roomCode}`);
    } catch (err) {
      alert('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = () => {
    if (!roomCode || roomCode.length !== 6) {
      alert('Enter a valid 6-character room code');
      return;
    }
    router.push(`/room/${roomCode.toUpperCase()}`);
  };

  return (
  <div className="min-h-screen bg-linear-to-br from-purple-50 to-pink-50 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Sudoku for Couples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create Room */}
          <div className="space-y-4">
            <h3 className="font-semibold">Create a Room</h3>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="together">Together</SelectItem>
                <SelectItem value="competitive">Competitive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={createRoom} disabled={loading} className="w-full">
              {loading ? 'Creating...' : 'Create Room'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-sm text-gray-500">OR</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Join Room */}
          <div className="space-y-4">
            <h3 className="font-semibold">Join by Code</h3>
            <Input
              placeholder="Enter 6-letter code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
            <Button onClick={joinRoom} variant="outline" className="w-full">
              Join Room
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}