"use client"

import { useEffect } from "react"
import { Wind } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getContextPrompt } from "@/types/breathing"
import type { ContextLabel } from "@/types/breathing"

const AUTO_ADVANCE_MS = 5000

export interface BreathingContextPromptProps {
  context: ContextLabel
  onStart: () => void
  onMaybeLater: () => void
}

export function BreathingContextPrompt({
  context,
  onStart,
  onMaybeLater,
}: BreathingContextPromptProps) {
  const message = getContextPrompt(context)

  // Auto-advance to breathing exercise after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onStart()
    }, AUTO_ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [onStart])

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6"
      role="dialog"
      aria-labelledby="breathing-context-heading"
      aria-describedby="breathing-context-message"
    >
      <div className="flex flex-col items-center gap-8 text-center max-w-sm w-full">
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Wind className="h-8 w-8 text-primary" aria-hidden />
          </div>
          <h1
            id="breathing-context-heading"
            className="text-2xl font-semibold text-foreground"
          >
            {message}
          </h1>
          <p id="breathing-context-message" className="sr-only">
            {message}. Choose to start a short breathing exercise or maybe later.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button
            onClick={onStart}
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12"
            aria-label="Start breathing"
          >
            Start breathing
          </Button>
          <button
            onClick={onMaybeLater}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Maybe later — return to dashboard"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
