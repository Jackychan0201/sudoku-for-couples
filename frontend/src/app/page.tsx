"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { ModeCard } from "@/components/mode-card"
import { Spinner } from "@/components/spinner"

export default function Home() {
  const [step, setStep] = useState<"mode" | "settings">("mode")
  const [mode, setMode] = useState<"together" | "competitive">("competitive")
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium")
  const [roomCode, setRoomCode] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    try {
      const saved = localStorage.getItem('playerName')
      if (saved) setPlayerName(saved)
    } catch (e) {
      // ignore
    }
  }, [])

  const createRoom = async () => {
    setLoading(true)
    setError("")
    try {
      // persist chosen display name globally
      try { localStorage.setItem('playerName', playerName) } catch (e) {}

      const res = await api.post("/rooms/create", { mode, difficulty })
      // Mark this client as the creator for the newly created room so other
      // pages can display Player 1 correctly. This is a local flag only;
      // the room record currently doesn't persist creator on the server.
      try {
        localStorage.setItem(`room:${res.data.roomCode}:creator`, 'true')
      } catch (e) {
        // ignore localStorage failures (e.g., SSR or private mode)
      }
      // persist the display name for this room so the room page can announce it
      try { localStorage.setItem(`room:${res.data.roomCode}:name`, playerName) } catch (e) {}

      router.push(`/room/${res.data.roomCode}`)
    } catch (err) {
      setError("Failed to create room. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const joinRoom = () => {
    if (!roomCode || roomCode.length !== 6) {
      setError("Enter a valid 6-character room code")
      return
    }
    try { localStorage.setItem('playerName', playerName) } catch (e) {}
    try { localStorage.setItem(`room:${roomCode.toUpperCase()}:name`, playerName) } catch (e) {}
    router.push(`/room/${roomCode.toUpperCase()}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Sudoku Duos
          </h1>
          <p className="text-lg text-gray-600">Connect, challenge, and conquer together</p>
        </div>

        {step === "mode" ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Choose your game mode</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ModeCard
                  title="Together"
                  description="Solve as a team and collaborate in real-time"
                  icon="🤝"
                  selected={mode === "together"}
                  onClick={() => setMode("together")}
                />
                <ModeCard
                  title="Competitive"
                  description="Race against your partner and compare scores"
                  icon="⚡"
                  selected={mode === "competitive"}
                  onClick={() => setMode("competitive")}
                />
              </div>
            </div>

            <Button onClick={() => setStep("settings")} className="w-full h-12 text-lg font-semibold mb-4">
              Continue
            </Button>
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-linear-to-br from-purple-50 via-white to-blue-50 text-gray-600">OR</span>
              </div>
            </div>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Join a Game</CardTitle>
                <CardDescription>Enter the code from your partner</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Enter 6-letter code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.2em] font-mono h-12"
                />
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
                )}
                <Button
                  onClick={joinRoom}
                  variant="outline"
                  className="w-full h-11 text-base font-semibold bg-transparent"
                >
                  Join Game
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="mb-6 shadow-lg border-0">
              <CardHeader>
                <CardTitle>Create a Game</CardTitle>
                <CardDescription>
                  {mode === "together" ? "Collaborate with your partner" : "Compete with your partner"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold">Difficulty Level</label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">🟢 Easy</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="hard">🔴 Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
                )}

                <Button onClick={createRoom} disabled={loading} className="w-full h-11 text-base font-semibold">
                  {loading ? <Spinner /> : "Create Game"}
                </Button>
              </CardContent>
            </Card>

            <Button onClick={() => setStep("mode")} variant="ghost" className="w-full mt-4">
              ← Back
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
