"use client"

import { useEffect, useState, useCallback } from "react"
import { X, Wind } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type Phase = "inhale" | "hold" | "exhale" | "rest"

const DEFAULT_PHASES: { phase: Phase; duration: number; label: string; instruction: string }[] = [
  { phase: "inhale", duration: 4000, label: "Breathe in", instruction: "through your nose" },
  { phase: "hold", duration: 4000, label: "Hold", instruction: "gently" },
  { phase: "exhale", duration: 6000, label: "Breathe out", instruction: "through your mouth" },
  { phase: "rest", duration: 2000, label: "Rest", instruction: "and reset" },
]

const CONTEXTUAL_PHASES: { phase: Phase; duration: number; label: string; instruction: string }[] = [
  { phase: "inhale", duration: 5000, label: "Breathe in", instruction: "through your nose" },
  { phase: "exhale", duration: 5000, label: "Breathe out", instruction: "through your mouth" },
]

export type BreathingMode = "default" | "contextual"

interface BreathingExerciseProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (feeling?: "calm" | "stressed") => void
  /** When "contextual": 5s in/out, 3 cycles, no feedback step; onComplete() called with no args. */
  mode?: BreathingMode
  /** In contextual mode, start exercise immediately (no intro screen). */
  startImmediately?: boolean
}

export function BreathingExercise({
  isOpen,
  onClose,
  onComplete,
  mode = "default",
  startImmediately = false,
}: BreathingExerciseProps) {
  const isContextual = mode === "contextual"
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [cycles, setCycles] = useState(0)
  const [isActive, setIsActive] = useState(() => isOpen && isContextual && startImmediately)
  const [showFeedback, setShowFeedback] = useState(false)
  const [countdown, setCountdown] = useState(() =>
    isOpen && isContextual && startImmediately ? Math.ceil(CONTEXTUAL_PHASES[0].duration / 1000) : 0
  )

  const phases = isContextual ? CONTEXTUAL_PHASES : DEFAULT_PHASES
  const currentPhase = phases[currentPhaseIndex]
  const totalCycles = 3

  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern)
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !isActive) return

    setCountdown(Math.ceil(currentPhase.duration / 1000))

    const countdownInterval = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1))
    }, 1000)

    const timer = setTimeout(() => {
      const nextIndex = (currentPhaseIndex + 1) % phases.length
      setCurrentPhaseIndex(nextIndex)

      if (nextIndex === 0) {
        setCycles((c) => c + 1)
        triggerHaptic([100, 50, 100])
      } else {
        triggerHaptic(30)
      }

      if (cycles >= totalCycles - 1 && nextIndex === 0) {
        setIsActive(false)
        if (isContextual) {
          onComplete()
        } else {
          setShowFeedback(true)
        }
      }
    }, currentPhase.duration)

    return () => {
      clearTimeout(timer)
      clearInterval(countdownInterval)
    }
  }, [isOpen, isActive, currentPhaseIndex, currentPhase.duration, cycles, triggerHaptic, isContextual, onComplete])

  useEffect(() => {
    if (isOpen) {
      setCurrentPhaseIndex(0)
      setCycles(0)
      setIsActive(!!(isContextual && startImmediately))
      setShowFeedback(false)
      setCountdown(
        isContextual && startImmediately ? Math.ceil(CONTEXTUAL_PHASES[0].duration / 1000) : 0
      )
    }
  }, [isOpen, isContextual, startImmediately])

  if (!isOpen) return null

  const getCircleAnimation = () => {
    if (!isActive) return ""
    if (currentPhase.phase === "inhale") return "animate-breathe-in"
    if (currentPhase.phase === "exhale") return "animate-breathe-out"
    return ""
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full p-3 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        aria-label={isContextual ? "Close and return to dashboard" : "Close"}
      >
        <X className="h-5 w-5" />
        <span className="sr-only">{isContextual ? "Close and return to dashboard" : "Close"}</span>
      </button>

      <div className="flex flex-col items-center gap-8 px-6 text-center w-full max-w-sm" aria-live="polite" aria-atomic="true">
        {!isActive && !showFeedback && !(isContextual && startImmediately) && (
          <>
            <div className="space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Wind className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">Pause. Breathe.</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Take a moment to center yourself with a guided breathing exercise.
              </p>
            </div>
            <Button
              onClick={() => {
                setIsActive(true)
                triggerHaptic(100)
              }}
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12"
            >
              Start Breathing
            </Button>
            <button
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Maybe later
            </button>
          </>
        )}

        {isActive && (
          <>
            <div className="space-y-1" aria-live="polite">
              <p className="text-sm text-muted-foreground" aria-label={`Cycle ${Math.min(cycles + 1, totalCycles)} of ${totalCycles}`}>
                Cycle {Math.min(cycles + 1, totalCycles)} of {totalCycles}
              </p>
            </div>

            <div className="relative flex h-56 w-56 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse-ring" />

              <div
                className={cn(
                  "flex h-44 w-44 items-center justify-center rounded-full bg-primary/20 transition-all",
                  getCircleAnimation()
                )}
                style={{
                  animationDuration: `${currentPhase.duration}ms`,
                }}
              >
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/30">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-4xl font-light text-primary tabular-nums">
                      {countdown}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1" aria-live="polite" aria-label={currentPhase.label}>
              <p className="text-xl font-medium text-foreground">
                {currentPhase.label}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentPhase.instruction}
              </p>
            </div>

            <div className="flex gap-2">
              {Array.from({ length: totalCycles }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 w-8 rounded-full transition-all duration-300",
                    i < cycles
                      ? "bg-primary"
                      : i === cycles
                        ? "bg-primary/50"
                        : "bg-secondary"
                  )}
                />
              ))}
            </div>
          </>
        )}

        {showFeedback && !isContextual && (
          <div className="space-y-8 w-full">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Nice work!</h2>
              <p className="text-muted-foreground">How are you feeling now?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onComplete("calm")}
                className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary hover:bg-primary/5 active:scale-95"
              >
                <span className="text-5xl">&#128524;</span>
                <span className="text-sm font-medium text-foreground">Better</span>
              </button>
              <button
                onClick={() => onComplete("stressed")}
                className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:border-gentle hover:bg-gentle/5 active:scale-95"
              >
                <span className="text-5xl">&#128533;</span>
                <span className="text-sm font-medium text-foreground">Still tough</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
