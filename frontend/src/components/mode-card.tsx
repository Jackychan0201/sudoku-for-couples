"use client"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface ModeCardProps {
  title: string
  description: string
  icon: ReactNode
  selected?: boolean
  onClick?: () => void
}

export function ModeCard({ title, description, icon, selected, onClick }: ModeCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-lg",
        selected && "ring-2 ring-primary ring-offset-2",
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="text-3xl ml-4">{icon}</div>
        </div>
      </CardHeader>
    </Card>
  )
}
