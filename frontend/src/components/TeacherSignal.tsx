"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"

import { CheckCircle2, HelpCircle, Turtle, AlertCircle } from "lucide-react"
import { useUser } from "@/context/UserContext"
import { useClassSession } from "@/context/ClassSessionContext"
import { createHelpRequest, type HelpRequestType } from "@/services/api"

export type TeacherSignalType = "question" | "slow" | "help"

const signals: {
  type: HelpRequestType
  icon: typeof HelpCircle
  label: string
  color: string
}[] = [

  {
    type: "help",
    icon: AlertCircle,
    label: "I need help",
    color: "bg-gentle/10 text-pink-500 hover:bg-gentle/20 border-gentle/20",
  },
  {
    type: "confused",
    icon: HelpCircle,
    label: "I'm confused",
    color: "bg-warm/10 text-amber-600 hover:bg-warm/20 border-warm/20",
  },
  {
    type: "slower",
    icon: Turtle,
    label: "Please be slower",
    color: "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20",
  },
]


interface TeacherSignalProps {
  /** Optional: parent callback when a signal is sent (e.g. analytics) */
  onSignal?: (type: TeacherSignalType) => void
}

const typeToSignal: Record<HelpRequestType, TeacherSignalType> = {
  help: "help",
  confused: "question",
  slower: "slow",
}

export function TeacherSignal({ onSignal }: TeacherSignalProps = {}) {
  const { user } = useUser()
  const { classSessionId, courseId } = useClassSession()
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [])

  const handleSignal = useCallback(
    async (type: HelpRequestType) => {
      if (sending) return
      setSending(true)
      setShowConfirmation(true)

      if ("vibrate" in navigator) {
        navigator.vibrate([50, 30, 50])
      }

      try {
        await createHelpRequest({
          type,
          studentId: user?._id ?? "anonymous",
          classSessionId,
          courseId: courseId || undefined,
          anonymous: false,
        })
        onSignal?.(typeToSignal[type])
        showToast("Sent. Your teacher will see it.")
      } catch (err) {
        console.error("Help request failed:", err)
        const msg = err instanceof Error ? err.message : "Couldn't send. Try again."
        showToast(msg.includes("Backend not running") ? msg : "Couldn't send. Try again.")
      } finally {
        setSending(false)
        setTimeout(() => setShowConfirmation(false), 2000)
      }
    },
    [user?._id, classSessionId, courseId, sending, showToast, onSignal]
  )


  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2">
        <h3 className="font-semibold text-foreground text-sm">Quick help</h3>
        <p className="text-xs text-muted-foreground">
          Tap once — your teacher will see it. Private.
        </p>
      </div>

      {toast && (
        <div className="mb-2 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1.5 text-xs text-primary animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {showConfirmation ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-foreground">Signal sent!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {signals.map((signal) => {
            const Icon = signal.icon
            return (
              <button
                key={signal.type}
                onClick={() => handleSignal(signal.type)}
                disabled={sending}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all active:scale-95 disabled:opacity-60",
                  signal.color
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium text-center leading-tight">
                  {signal.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
