"use client"

import { useEffect, useState } from "react"
import { X, Smile, MessageCircle, Volume2, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface ContextClue {
  id: string
  message: string
  type: "joke" | "sarcasm" | "tone" | "info"
}

interface ContextClueOverlayProps {
  clue: ContextClue | null
  onDismiss: () => void
}

const typeConfig = {
  joke: {
    icon: Smile,
    bg: "bg-warm/15",
    border: "border-warm/30",
    iconBg: "bg-warm/20",
    iconColor: "text-amber-600"
  },
  sarcasm: {
    icon: MessageCircle,
    bg: "bg-gentle/15",
    border: "border-gentle/30",
    iconBg: "bg-gentle/20",
    iconColor: "text-pink-500"
  },
  tone: {
    icon: Volume2,
    bg: "bg-primary/15",
    border: "border-primary/30",
    iconBg: "bg-primary/20",
    iconColor: "text-primary"
  },
  info: {
    icon: Users,
    bg: "bg-secondary",
    border: "border-border",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground"
  },
}

export function ContextClueOverlay({ clue, onDismiss }: ContextClueOverlayProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (clue) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [clue, onDismiss])

  if (!clue) return null

  const config = typeConfig[clue.type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "fixed top-20 left-4 right-4 z-50 mx-auto max-w-sm transition-all duration-300",
        isVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-4 opacity-0"
      )}
    >
      <div className={cn(
        "flex items-center gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-sm",
        config.bg,
        config.border
      )}>
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          config.iconBg,
          config.iconColor
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="flex-1 text-sm font-medium text-foreground leading-snug">
          {clue.message}
        </p>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onDismiss, 300)
          }}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </button>
      </div>
    </div>
  )
}
