"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Check, Loader2 } from "lucide-react"
import { logEmotion } from "@/services/api"

export type Mood = "great" | "good" | "okay" | "tough" | "hard"

interface MoodTrackerProps {
  userId: string
  onMoodSelect: (mood: Mood) => void
  todaysMood: Mood | null
  context?: string
  sessionId?: string
}

const moods: { value: Mood; emoji: string; label: string; stressLevel: number }[] = [
  { value: "great", emoji: "\u{1F929}", label: "Great", stressLevel: 0 },
  { value: "good", emoji: "\u{1F60A}", label: "Good", stressLevel: 1 },
  { value: "okay", emoji: "\u{1F610}", label: "Okay", stressLevel: 2 },
  { value: "tough", emoji: "\u{1F614}", label: "Tough", stressLevel: 3 },
  { value: "hard", emoji: "\u{1F622}", label: "Hard", stressLevel: 4 },
]

export function MoodTracker({ userId, onMoodSelect, todaysMood, context, sessionId }: MoodTrackerProps) {
  const [isLogging, setIsLogging] = useState(false)

  const handleSelect = async (mood: Mood) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(30)
    }

    // Optimistically update UI
    onMoodSelect(mood)

    // Find the mood data for stress level
    const moodData = moods.find((m) => m.value === mood)

    // Log to backend
    setIsLogging(true)
    try {
      await logEmotion(userId, moodData?.emoji || mood, {
        context,
        stressLevel: moodData?.stressLevel,
        sessionId,
      })
    } catch (error) {
      console.error("Failed to log emotion:", error)
      // UI already updated, just log the error
    } finally {
      setIsLogging(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">How are you feeling?</h3>
        <p className="text-sm text-muted-foreground">Tap to log your mood</p>
      </div>

      <div className="flex items-center justify-between gap-1">
        {moods.map((mood) => {
          const isSelected = todaysMood === mood.value
          return (
            <button
              key={mood.value}
              onClick={() => handleSelect(mood.value)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all duration-200 active:scale-95",
                isSelected
                  ? "bg-primary/10 ring-2 ring-primary"
                  : "hover:bg-secondary"
              )}
            >
              <span className={cn(
                "text-2xl transition-transform duration-200",
                isSelected && "scale-110"
              )}>
                {mood.emoji}
              </span>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}>
                {mood.label}
              </span>
              {isSelected && (
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {todaysMood && (
        <p className="mt-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          {isLogging && <Loader2 className="h-3 w-3 animate-spin" />}
          {isLogging ? "Saving..." : "Mood logged. You can change it anytime."}
        </p>
      )}
    </div>
  )
}
