"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Mic, MicOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface AudioAnalyzerProps {
  onContextClue: (clue: { id: string; message: string; type: "joke" | "sarcasm" | "tone" | "info" }) => void
  onStressDetected: () => void
  onListeningChange?: (listening: boolean) => void
}

export function AudioAnalyzer({ onContextClue, onStressDetected, onListeningChange }: AudioAnalyzerProps) {
  const [isListening, setIsListening] = useState(false)
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(16).fill(4))
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onContextClueRef = useRef(onContextClue)
  const onStressDetectedRef = useRef(onStressDetected)

  useEffect(() => {
    onContextClueRef.current = onContextClue
    onStressDetectedRef.current = onStressDetected
  }, [onContextClue, onStressDetected])

  const toggleListening = useCallback(() => {
    if (isListening) {
      setIsListening(false)
      onListeningChange?.(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setAudioLevels(Array(16).fill(4))
    } else {
      setIsListening(true)
      onListeningChange?.(true)
      if ("vibrate" in navigator) {
        navigator.vibrate(50)
      }
    }
  }, [isListening, onListeningChange])

  useEffect(() => {
    if (isListening) {
      intervalRef.current = setInterval(() => {
        setAudioLevels(
          Array(16).fill(0).map(() => Math.random() * 28 + 4)
        )

        if (Math.random() > 0.97) {
          const clues = [
            { id: "1", message: "That laugh was friendly, not directed at you", type: "joke" as const },
            { id: "2", message: "Speaker is being playful, not serious", type: "sarcasm" as const },
            { id: "3", message: "Voice tone suggests excitement, not frustration", type: "tone" as const },
            { id: "4", message: "Multiple people talking - group discussion", type: "info" as const },
          ]
          const randomClue = clues[Math.floor(Math.random() * clues.length)]
          onContextClueRef.current({ ...randomClue, id: Date.now().toString() })
        }

        if (Math.random() > 0.995) {
          onStressDetectedRef.current()
        }
      }, 100)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isListening])

  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-6">
        <div className="flex items-center justify-center gap-[3px] h-16">
          {audioLevels.map((level, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-all duration-100",
                isListening ? "bg-primary" : "bg-muted"
              )}
              style={{
                height: `${level}px`,
              }}
            />
          ))}
        </div>
      </div>

      <button
        onClick={toggleListening}
        className={cn(
          "relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 active:scale-95",
          isListening
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        )}
      >
        {isListening ? (
          <Mic className="h-7 w-7" />
        ) : (
          <MicOff className="h-7 w-7" />
        )}

        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
            <span className="absolute -inset-2 rounded-full border-2 border-primary/20 animate-pulse" />
          </>
        )}
      </button>

      <p className="mt-4 text-sm text-muted-foreground">
        {isListening ? "Listening for social cues..." : "Tap to start context listener"}
      </p>
    </div>
  )
}
