import { cn } from "@/lib/utils"

interface PlayerBadgeProps {
  player: number
  status?: "waiting" | "playing" | "finished"
}

export function PlayerBadge({ player, status }: PlayerBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
        status === "finished" && "bg-green-100 text-green-800",
        status === "waiting" && "bg-yellow-100 text-yellow-800",
        status === "playing" && "bg-blue-100 text-blue-800",
        !status && "bg-muted text-muted-foreground",
      )}
    >
      <div
        className={cn(
          "w-2 h-2 rounded-full",
          status === "finished" && "bg-green-600",
          status === "waiting" && "bg-yellow-600",
          status === "playing" && "bg-blue-600",
          !status && "bg-muted-foreground",
        )}
      />
      Player {player}
    </div>
  )
}
