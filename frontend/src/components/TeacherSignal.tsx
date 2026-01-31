"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { CheckCircle2, HelpCircle, Turtle, AlertCircle, Loader2 } from "lucide-react"
import { sendTeacherRequest, type TeacherRequestType } from "@/services/api"

type SignalType = "question" | "slow" | "help"

// Map UI signal types to backend request types
const signalToRequestType: Record<SignalType, TeacherRequestType> = {
  question: "confused",
  slow: "slow_down",
  help: "need_help",
}

interface TeacherSignalProps {
  studentId: string
  teacherId?: string
  classSession?: string
  onSignal?: (type: SignalType) => void
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

export function TeacherSignal({ studentId, teacherId, classSession, onSignal }: TeacherSignalProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignal = async (type: SignalType) => {
    if ("vibrate" in navigator) {
      navigator.vibrate([50, 30, 50])
    }

    setIsSending(true)
    setError(null)

    try {
      // Map UI type to backend request type
      const requestType = signalToRequestType[type]
      
      // Send to backend
      await sendTeacherRequest(studentId, requestType, {
        teacherId,
        classSession,
      })

      // Show confirmation
      setShowConfirmation(true)
      onSignal?.(type)

      setTimeout(() => {
        setShowConfirmation(false)
      }, 3000)
    } catch (err) {
      console.error("Failed to send teacher request:", err)
      setError("Failed to send. Please try again.")
      setTimeout(() => setError(null), 3000)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 h-full">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Signal Teacher</h3>
        <p className="text-sm text-muted-foreground">Private and anonymous</p>
      </div>

      {isSending ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Sending...</p>
        </div>
      ) : showConfirmation ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">Signal sent!</p>
            <p className="text-sm text-muted-foreground">Your teacher has been notified</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/20">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">Couldn't send</p>
            <p className="text-sm text-muted-foreground">{error}</p>
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
                disabled={isSending}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all active:scale-95",
                  signal.color,
                  isSending && "opacity-50 cursor-not-allowed"
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
