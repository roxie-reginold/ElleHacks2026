"use client"

import { useState, useCallback } from "react"
import { Navigation } from "@/components/ui/Navigation"
import { BreathingExercise } from "@/components/BreathingExercise"
import { AudioAnalyzer } from "@/components/AudioAnalyzer"
import { MoodTracker, type Mood } from "@/components/MoodTracker"
import { TeacherSignal } from "@/components/TeacherSignal"
import { CourageClips, type CourageClip } from "@/components/CourageClips"
import { WeeklyDashboard } from "@/components/WeeklyDashboard"
import { ContextClueOverlay } from "@/components/ContextClueOverlay"
import { useUser } from "@/context/UserContext"
import { Wind, Sparkles, Heart, MessageCircle, X, Smile, Volume2, Users, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { incrementFocusMoments } from "@/services/api"

interface ContextClue {
  id: string
  message: string
  type: "joke" | "sarcasm" | "tone" | "info"
  suggestion?: string
}

const sampleWeeklyStats = {
  moodData: [
    { day: "Mon", mood: 4 },
    { day: "Tue", mood: 5 },
    { day: "Wed", mood: 3 },
    { day: "Thu", mood: 4 },
    { day: "Fri", mood: 4 },
    { day: "Sat", mood: 5 },
    { day: "Sun", mood: 4 },
  ],
  breathingBreaks: 12,
  winsLogged: 8,
  signalsSent: 3,
  topMood: "Good",
  insight: "You're calmer on Tuesdays. Group work days seem to go better when you use your breathing exercises first.",
}

const typeConfig = {
  joke: {
    icon: Smile,
    label: "Joke detected",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    textClass: "text-emerald-400"
  },
  sarcasm: {
    icon: MessageCircle,
    label: "Sarcasm noted",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    textClass: "text-emerald-400"
  },
  tone: {
    icon: Volume2,
    label: "Tone shift",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    textClass: "text-emerald-400"
  },
  info: {
    icon: Users,
    label: "Social cue",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    textClass: "text-emerald-400"
  },
}

export default function App() {
  const { user } = useUser()
  const userId = user?._id || 'demo-user'
  
  const [activeTab, setActiveTab] = useState("home")
  const [contextClues, setContextClues] = useState<ContextClue[]>([])
  const [currentClue, setCurrentClue] = useState<ContextClue | null>(null)
  const [showBreathing, setShowBreathing] = useState(false)
  const [todaysMood, setTodaysMood] = useState<Mood | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [stressAlert, setStressAlert] = useState(false)
  const [courageClips, setCourageClips] = useState<CourageClip[]>([])

  const handleContextClue = useCallback((clue: ContextClue) => {
    const clueWithSuggestion = {
      ...clue,
      suggestion: clue.type === "joke"
        ? "Try smiling or nodding to show you got it"
        : clue.type === "sarcasm"
          ? "They mean the opposite of what they said"
          : clue.type === "tone"
            ? "Take a breath, their tone may not be about you"
            : "Notice the social cue and respond naturally"
    }
    setContextClues(prev => [clueWithSuggestion, ...prev].slice(0, 10))
    setCurrentClue(clueWithSuggestion)
  }, [])

  const handleStressDetected = useCallback(() => {
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100, 50, 100])
    }
    setStressAlert(true)
  }, [])

  const handleBreathingComplete = useCallback(async (_feeling: "calm" | "stressed") => {
    setShowBreathing(false)
    setStressAlert(false)
    
    // Increment focus moments when completing breathing exercise
    try {
      await incrementFocusMoments(userId)
    } catch (error) {
      console.error("Failed to increment focus moments:", error)
    }
  }, [userId])

  const handleMoodSelect = useCallback((mood: Mood) => {
    setTodaysMood(mood)
  }, [])

  const handleTeacherSignal = useCallback((_type: "question" | "slow" | "help") => {
    // Teacher signal is now handled by the component itself via API
  }, [])

  const handleClipsChange = useCallback((clips: CourageClip[]) => {
    setCourageClips(clips)
  }, [])

  const removeClue = (id: string) => {
    setContextClues(prev => prev.filter(c => c.id !== id))
  }

  const handleListeningChange = (listening: boolean) => {
    setIsListening(listening)
    if (!listening) {
      setContextClues([])
      setCurrentClue(null)
    }
  }

  const dismissOverlayClue = useCallback(() => {
    setCurrentClue(null)
  }, [])

  return (
    <div className="min-h-screen bg-background lg:pl-20">
      <BreathingExercise
        isOpen={showBreathing}
        onClose={() => setShowBreathing(false)}
        onComplete={handleBreathingComplete}
      />

      <ContextClueOverlay clue={currentClue} onDismiss={dismissOverlayClue} />

      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 lg:px-8 py-3">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-foreground">CalmSpace</span>
          </div>
          <h1 className="hidden lg:block text-lg font-semibold text-foreground">CalmSpace</h1>
          <button
            onClick={() => setShowBreathing(true)}
            className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 active:scale-95"
          >
            <Wind className="h-4 w-4" />
            Breathe
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 lg:px-8 py-5 pb-24 lg:pb-8">
        {activeTab === "home" && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 lg:max-w-xl space-y-5">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h1 className="text-lg font-semibold text-foreground mb-1">
                  Welcome back
                </h1>
                <p className="text-sm text-muted-foreground">
                  How can I support you today?
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="text-center mb-4">
                  <h2 className="font-semibold text-foreground">Context Listener</h2>
                  <p className="text-sm text-muted-foreground">Helps understand social cues</p>
                </div>
                <AudioAnalyzer
                  onContextClue={handleContextClue}
                  onStressDetected={handleStressDetected}
                  onListeningChange={handleListeningChange}
                />
              </div>

              <MoodTracker 
                userId={userId}
                onMoodSelect={handleMoodSelect} 
                todaysMood={todaysMood} 
              />

              <TeacherSignal 
                studentId={userId}
                onSignal={handleTeacherSignal} 
              />
            </div>

            <div className="lg:w-96 lg:sticky lg:top-20 lg:self-start">
              <div className={cn(
                "rounded-2xl border-2 border-dashed p-5 min-h-[400px] transition-all duration-300",
                isListening
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card/50"
              )}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full transition-colors",
                    isListening ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                  )} />
                  <h3 className={cn(
                    "text-sm font-medium transition-colors",
                    isListening ? "text-primary" : "text-muted-foreground"
                  )}>
                    {isListening ? "Listening for context clues..." : "Context Clues"}
                  </h3>
                </div>

                {stressAlert && (
                  <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-600">Stress detected</p>
                        <p className="text-xs text-amber-600/70 mt-1">Pause. Breathe. You&apos;re okay.</p>
                        <button
                          onClick={() => setShowBreathing(true)}
                          className="mt-2 text-xs font-medium text-amber-600 hover:text-amber-500 underline underline-offset-2"
                        >
                          Start breathing exercise
                        </button>
                      </div>
                      <button
                        onClick={() => setStressAlert(false)}
                        className="text-amber-500/50 hover:text-amber-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {!isListening && contextClues.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <Volume2 className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tap &quot;Start Listening&quot; to detect social cues
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Context clues will appear here
                    </p>
                  </div>
                )}

                {isListening && contextClues.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                      <Volume2 className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <p className="text-sm text-primary">
                      Listening for audio...
                    </p>
                    <p className="text-xs text-primary/70 mt-1">
                      Context clues will appear as detected
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {contextClues.map((clue, index) => {
                    const config = typeConfig[clue.type]
                    const Icon = config.icon
                    return (
                      <div
                        key={clue.id}
                        className={cn(
                          "rounded-xl border p-4 transition-all animate-in fade-in slide-in-from-top-2",
                          config.bgClass,
                          config.borderClass
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                            "bg-emerald-500/20"
                          )}>
                            <Icon className={cn("h-4 w-4", config.textClass)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-xs font-medium mb-1", config.textClass)}>
                              {config.label}
                            </p>
                            <p className="text-sm text-foreground leading-snug">
                              {clue.message}
                            </p>
                            {clue.suggestion && (
                              <p className="text-xs text-emerald-600/70 mt-2 italic">
                                Try: {clue.suggestion}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeClue(clue.id)}
                            className="text-emerald-500/40 hover:text-emerald-500 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "insights" && (
          <WeeklyDashboard stats={sampleWeeklyStats} />
        )}

        {activeTab === "courage" && (
          <CourageClips
            userId={userId}
            clips={courageClips}
            onClipsChange={handleClipsChange}
          />
        )}

        {activeTab === "help" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Support</h2>
              <p className="text-sm text-muted-foreground">Tools to help you through tough moments</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <TeacherSignal studentId={userId} onSignal={handleTeacherSignal} />
              </div>

              <div className="lg:col-span-1 rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowBreathing(true)}
                    className="flex w-full items-center gap-4 rounded-xl bg-primary/5 border border-primary/20 p-4 text-left transition-colors hover:bg-primary/10 active:scale-[0.98]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20">
                      <Wind className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Breathing Exercise</p>
                      <p className="text-sm text-muted-foreground">Take a calming break</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("courage")}
                    className="flex w-full items-center gap-4 rounded-xl bg-secondary p-4 text-left transition-colors hover:bg-secondary/80 active:scale-[0.98]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                      <MessageCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Play Courage Clip</p>
                      <p className="text-sm text-muted-foreground">Listen to your affirmations</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-1 rounded-2xl border border-gentle/20 bg-gentle/5 p-5 h-fit">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gentle/20">
                    <Heart className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Remember</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      It&apos;s okay to not be okay. You have tools to help you through tough moments,
                      and asking for help is a sign of strength.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
