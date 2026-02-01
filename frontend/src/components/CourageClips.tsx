"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Play, Pause, Trash2, Plus, Sparkles, Clock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { FloatingMascot } from "@/components/Mascot"
import {
  saveAffirmation,
  getAffirmations,
  deleteAffirmation,
  markAffirmationPlayed,
  textToSpeech,
  getAudioUrl,
  type Affirmation,
  type AffirmationTrigger,
} from "@/services/api"

// Map UI trigger labels to backend trigger types
const triggerMapping: Record<string, AffirmationTrigger> = {
  "Group work": "group_work_starts",
  "Presentations": "before_presentation",
  "New situations": "stress_detected",
  "Tests": "stress_detected",
  "Feeling alone": "manual",
  "Before class": "before_raising_hand",
}

export interface CourageClip {
  id: string
  audioUrl: string
  trigger: string
  text: string
  createdAt: Date
  duration: number
  timesPlayed: number
}

interface CourageClipsProps {
  userId: string
  clips?: CourageClip[]
  onClipsChange?: (clips: CourageClip[]) => void
  /** Optional: called when a new clip is saved (parent can sync state or show toast) */
  onSaveClip?: (clip: CourageClip) => void
}

const triggerLabels = [
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

export function CourageClips({ userId, clips: externalClips, onClipsChange, onSaveClip }: CourageClipsProps) {
  const [clips, setClips] = useState<CourageClip[]>(externalClips || [])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showNewClipForm, setShowNewClipForm] = useState(false)
  const [selectedTrigger, setSelectedTrigger] = useState<string>("")
  const [playingClipId, setPlayingClipId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [recordedText, setRecordedText] = useState("")
  const [currentAffirmation] = useState(() =>
    affirmations[Math.floor(Math.random() * affirmations.length)]
  )
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Fetch clips from backend on mount
  useEffect(() => {
    if (!externalClips) {
      fetchClips()
    }
  }, [userId])

  const fetchClips = async () => {
    setIsLoading(true)
    try {
      const affirmations = await getAffirmations(userId)
      const mappedClips: CourageClip[] = affirmations.map((a: Affirmation) => ({
        id: a._id || "",
        audioUrl: a.audioUrl,
        trigger: Object.entries(triggerMapping).find(([_, v]) => a.triggers.includes(v))?.[0] || a.triggers[0],
        text: a.text,
        createdAt: new Date(a.createdAt || Date.now()),
        duration: 10, // Default duration since backend doesn't store it
        timesPlayed: a.timesPlayed,
      }))
      setClips(mappedClips)
      onClipsChange?.(mappedClips)
    } catch (error) {
      console.error("Failed to fetch affirmations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClip = async (id: string) => {
    try {
      await deleteAffirmation(id)
      const newClips = clips.filter((c) => c.id !== id)
      setClips(newClips)
      onClipsChange?.(newClips)
    } catch (error) {
      console.error("Failed to delete affirmation:", error)
    }
  }

  const handlePlayClip = async (id: string) => {
    const clip = clips.find((c) => c.id === id)
    if (!clip) return

    if (playingClipId === id) {
      // Stop playing
      audioRef.current?.pause()
      setPlayingClipId(null)
      return
    }

    // Play the clip
    setPlayingClipId(id)

    try {
      // Mark as played in backend
      await markAffirmationPlayed(id)

      // Update local state
      const updatedClips = clips.map((c) =>
        c.id === id ? { ...c, timesPlayed: c.timesPlayed + 1 } : c
      )
      setClips(updatedClips)
      onClipsChange?.(updatedClips)
    } catch (error) {
      console.error("Failed to mark affirmation played:", error)
    }

    // Play audio
    if (clip.audioUrl) {
      const audioUrl = clip.audioUrl.startsWith("http")
        ? clip.audioUrl
        : getAudioUrl(clip.audioUrl.replace(/^.*\//, ""))

      if (!audioRef.current) {
        audioRef.current = new Audio()
      }
      audioRef.current.src = audioUrl
      audioRef.current.onended = () => setPlayingClipId(null)
      audioRef.current.play().catch((e) => {
        console.error("Audio playback failed:", e)
        setPlayingClipId(null)
      })
    } else {
      // Fallback: just show as playing briefly
      setTimeout(() => setPlayingClipId(null), 3000)
    }
  }

  const startRecording = useCallback(async () => {
    setIsRecording(true)
    setRecordingTime(0)
    audioChunksRef.current = []

    if ("vibrate" in navigator) {
      navigator.vibrate(50)
    }

    // Start actual audio recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(100) // Collect data every 100ms
    } catch (error) {
      console.error("Failed to start recording:", error)
      setIsRecording(false)
      return
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

  const stopRecording = useCallback(async () => {
    setIsRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
    }

    if (!selectedTrigger || recordingTime === 0) return

    setIsSaving(true)

    try {
      // Use the suggested affirmation as the text
      const affirmationText = recordedText || currentAffirmation

      // Generate TTS audio for the affirmation
      const ttsResult = await textToSpeech(affirmationText)

      if (!ttsResult.success || !ttsResult.audioPath) {
        throw new Error(ttsResult.error || "TTS failed")
      }

      // Map the selected trigger to backend trigger type
      const backendTrigger = triggerMapping[selectedTrigger] || "manual"

      // Save to backend
      const saved = await saveAffirmation(
        userId,
        affirmationText,
        ttsResult.audioPath,
        [backendTrigger],
        true // isCustomVoice - using their chosen text
      )

      // Add to local state
      const newClip: CourageClip = {
        id: saved._id || Date.now().toString(),
        audioUrl: saved.audioUrl,
        trigger: selectedTrigger,
        text: affirmationText,
        createdAt: new Date(),
        duration: recordingTime,
        timesPlayed: 0,
      }

      const newClips = [newClip, ...clips]
      setClips(newClips)
      onClipsChange?.(newClips)
      onSaveClip?.(newClip)

      // Reset form
      setShowNewClipForm(false)
      setSelectedTrigger("")
      setRecordingTime(0)
      setRecordedText("")
    } catch (error) {
      console.error("Failed to save affirmation:", error)
      alert("Failed to save your courage clip. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }, [selectedTrigger, recordingTime, currentAffirmation, recordedText, userId, clips, onClipsChange, onSaveClip])

  const resetForm = () => {
    setShowNewClipForm(false)
    setSelectedTrigger("")
    setIsRecording(false)
    setRecordingTime(0)
    setRecordedText("")
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Courage Clips</h2>
            <p className="text-sm text-muted-foreground">Your voice, your strength</p>
          </div>
          <FloatingMascot
            variant="small"
            className="relative hidden md:flex"
            message="You're brave! 💪"
          />
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
                  {triggerLabels.map((trigger: string) => (
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
                <div className="space-y-3">
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
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Or write your own affirmation:
                    </label>
                    <input
                      type="text"
                      value={recordedText}
                      onChange={(e) => setRecordedText(e.target.value)}
                      placeholder={currentAffirmation}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={isRecording || isSaving}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-center py-6 lg:py-0">
              {selectedTrigger ? (
                <>
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isSaving}
                    className={cn(
                      "relative flex h-24 w-24 items-center justify-center rounded-full transition-all active:scale-95",
                      isSaving
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : isRecording
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {isSaving ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : isRecording ? (
                      <Square className="h-8 w-8" />
                    ) : (
                      <Mic className="h-8 w-8" />
                    )}
                    {isRecording && !isSaving && (
                      <span className="absolute inset-0 rounded-full bg-destructive/30 animate-ping" />
                    )}
                  </button>
                  <div className="text-center mt-4">
                    <p className="text-sm font-medium text-foreground">
                      {isSaving
                        ? "Creating your clip..."
                        : isRecording
                          ? `Recording... ${recordingTime}s`
                          : "Tap to record"}
                    </p>
                    {isRecording && !isSaving && (
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : clips.length === 0 ? (
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
                    onClick={() => handlePlayClip(clip.id)}
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
                    <p className="text-xs text-muted-foreground truncate">{clip.text}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {clip.timesPlayed} plays
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteClip(clip.id)}
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
