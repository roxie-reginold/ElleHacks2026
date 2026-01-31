"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { CheckCircle2, HelpCircle, Turtle, AlertCircle } from "lucide-react"

type SignalType = "question" | "slow" | "help"

interface TeacherSignalProps {
  onSignal: (type: SignalType) => void
}

const signals: { type: SignalType; icon: typeof HelpCircle; label: string; description: string; color: string }[] = [
  {
    type: "question",
    icon: HelpCircle,
    label: "Question",
    description: "I have a question",
    color: "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
  },
  {
    type: "slow",
    icon: Turtle,
    label: "Slow down",
    description: "Please go slower",
    color: "bg-warm/10 text-amber-600 hover:bg-warm/20 border-warm/20"
  },
  {
    type: "help",
    icon: AlertCircle,
    label: "Need help",
    description: "I need support",
    color: "bg-gentle/10 text-pink-500 hover:bg-gentle/20 border-gentle/20"
  },
]

export function TeacherSignal({ onSignal }: TeacherSignalProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleSignal = (type: SignalType) => {
    setShowConfirmation(true)
    onSignal(type)

    if ("vibrate" in navigator) {
      navigator.vibrate([50, 30, 50])
    }

    setTimeout(() => {
      setShowConfirmation(false)
      }, 3000)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 h-full">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Signal Teacher</h3>
        <p className="text-sm text-muted-foreground">Private and anonymous</p>
      </div>

      {showConfirmation ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">Signal sent!</p>
            <p className="text-sm text-muted-foreground">Your teacher has been notified</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {signals.map((signal) => {
            const Icon = signal.icon
            return (
              <button
                key={signal.type}
                onClick={() => handleSignal(signal.type)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all active:scale-95",
                  signal.color
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium">{signal.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
