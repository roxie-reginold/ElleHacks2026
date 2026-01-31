"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Play, Pause, Trash2, Plus, Sparkles, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface CourageClip {
  id: string
  audioUrl: string
  trigger: string
  createdAt: Date
  duration: number
}

interface CourageClipsProps {
  clips: CourageClip[]
  onSaveClip: (clip: Omit<CourageClip, "id" | "createdAt">) => void
  onDeleteClip: (id: string) => void
  onPlayClip: (id: string) => void
}

const triggers = [
  "Group work",
  "Presentations",
  "New situations",
  "Tests",
  "Feeling alone",
  "Before class",
]

const affirmations = [
  "I belong here",
  "I can do hard things",
  "My voice matters",
  "I am capable",
  "It's okay to ask for help",
  "I've got this",
]

export function CourageClips({ clips, onSaveClip, onDeleteClip, onPlayClip }: CourageClipsProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showNewClipForm, setShowNewClipForm] = useState(false)
  const [selectedTrigger, setSelectedTrigger] = useState<string>("")
  const [playingClipId, setPlayingClipId] = useState<string | null>(null)
  const [currentAffirmation] = useState(() =>
    affirmations[Math.floor(Math.random() * affirmations.length)]
  )
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = useCallback(() => {
    setIsRecording(true)
    setRecordingTime(0)

    if ("vibrate" in navigator) {
      navigator.vibrate(50)
    }

    timerRef.current = setInterval(() => {
      setRecordingTime((t) => {
        if (t >= 30) {
          return t
        }
        return t + 1
      })
    }, 1000)
  }, [])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    if (selectedTrigger && recordingTime > 0) {
      onSaveClip({
        audioUrl: "simulated-audio-url",
        trigger: selectedTrigger,
        duration: recordingTime,
      })
      setShowNewClipForm(false)
      setSelectedTrigger("")
      setRecordingTime(0)
    }
  }, [selectedTrigger, recordingTime, onSaveClip])

  const togglePlayClip = (id: string) => {
    if (playingClipId === id) {
      setPlayingClipId(null)
    } else {
      setPlayingClipId(id)
      onPlayClip(id)
      const clip = clips.find(c => c.id === id)
      setTimeout(() => setPlayingClipId(null), (clip?.duration || 3) * 1000)
    }
  }

  const resetForm = () => {
    setShowNewClipForm(false)
    setSelectedTrigger("")
    setIsRecording(false)
    setRecordingTime(0)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Courage Clips</h2>
          <p className="text-sm text-muted-foreground">Your voice, your strength</p>
        </div>
        {!showNewClipForm && (
          <Button
            size="sm"
            onClick={() => setShowNewClipForm(true)}
            className="bg-primary text-primary-foreground rounded-xl"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Record New
          </Button>
        )}
      </div>

      {showNewClipForm && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-3">
                  When do you need encouragement?
                </p>
                <div className="flex flex-wrap gap-2">
                  {triggers.map((trigger) => (
                    <button
                      key={trigger}
                      onClick={() => setSelectedTrigger(trigger)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95",
                        selectedTrigger === trigger
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      )}
                    >
                      {trigger}
                    </button>
                  ))}
                </div>
              </div>

              {selectedTrigger && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Try saying:</p>
                      <p className="text-sm font-medium text-foreground">
                        &quot;{currentAffirmation}&quot;
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-center py-6 lg:py-0">
              {selectedTrigger ? (
                <>
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                      "relative flex h-24 w-24 items-center justify-center rounded-full transition-all active:scale-95",
                      isRecording
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {isRecording ? (
                      <Square className="h-8 w-8" />
                    ) : (
                      <Mic className="h-8 w-8" />
                    )}
                    {isRecording && (
                      <span className="absolute inset-0 rounded-full bg-destructive/30 animate-ping" />
                    )}
                  </button>
                  <div className="text-center mt-4">
                    <p className="text-sm font-medium text-foreground">
                      {isRecording ? `Recording... ${recordingTime}s` : "Tap to record"}
                    </p>
                    {isRecording && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Tap again to save
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Mic className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select a trigger to start recording
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={resetForm}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!showNewClipForm && (
        <>
          {clips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mic className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium text-foreground">No clips yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Record your first courage clip to play when you need it
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all",
                    playingClipId === clip.id && "border-primary bg-primary/5"
                  )}
                >
                  <button
                    onClick={() => togglePlayClip(clip.id)}
                    className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95",
                      playingClipId === clip.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {playingClipId === clip.id ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6 ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{clip.trigger}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{clip.duration}s</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteClip(clip.id)}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete clip</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
