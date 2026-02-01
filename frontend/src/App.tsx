"use client"

import { useState, useCallback, useEffect } from "react"
import { Navigation } from "@/components/ui/Navigation"
import { BreathingExercise } from "@/components/BreathingExercise"

import { BreathingContextPrompt } from "@/components/BreathingContextPrompt"
import { AudioAnalyzer } from "@/components/AudioAnalyzer"
import { MoodTracker, type Mood } from "@/components/MoodTracker"
import { FaceEmotionCheck } from "@/components/FaceEmotionCheck"
import type { ContextLabel } from "@/types/breathing"
import { TeacherSignal } from "@/components/TeacherSignal"
import { CourageClips, type CourageClip } from "@/components/CourageClips"
import { WeeklyDashboard } from "@/components/WeeklyDashboard"
import { ContextClueOverlay } from "@/components/ContextClueOverlay"
import { useUser } from "@/context/UserContext"
import { useContextListener } from "@/hooks/useContextListener"
import { Wind, Sparkles, Heart, MessageCircle, X, Smile, Volume2, Users, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { incrementFocusMoments, getWeeklyDashboard, type WeeklyDashboardApiResponse } from "@/services/api"

interface ContextClue {
  id: string
  message: string
  type: "joke" | "sarcasm" | "tone" | "info"
  suggestion?: string
}

const defaultWeeklyStats = {
  moodData: [
    { day: "Mon", mood: 3 },
    { day: "Tue", mood: 3 },
    { day: "Wed", mood: 3 },
    { day: "Thu", mood: 3 },
    { day: "Fri", mood: 3 },
    { day: "Sat", mood: 3 },
    { day: "Sun", mood: 3 },
  ],
  breathingBreaks: 0,
  winsLogged: 0,
  signalsSent: 0,
  topMood: "—",
  insight: "Log your mood and use the app this week to see insights here.",
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
  /** When set, the context-aware breathing flow is active (full-page). Prompt → exercise → dashboard. */
  const [breathingContextFlow, setBreathingContextFlow] = useState<ContextLabel | null>(null)
  /** When true, we're in the exercise phase of the context flow (after "Start breathing"). */
  const [breathingContextExercise, setBreathingContextExercise] = useState(false)
  const [todaysMood, setTodaysMood] = useState<Mood | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [stressAlert, setStressAlert] = useState(false)
  const [courageClips, setCourageClips] = useState<CourageClip[]>([])

  // Real-time ElevenLabs transcription + Gemini tone/social cue analysis
  const {
    isStreaming,
    liveTranscript,
    currentContext,
    startListening: startRealListening,
    stopListening: stopRealListening,
    connect,
  } = useContextListener({
    userId,
    autoConnect: false,
    mode: 'streaming',
  })

  // Sync listening state
  useEffect(() => {
    setIsListening(isStreaming)
  }, [isStreaming])

  // Fetch real dashboard when Insights tab is shown
  useEffect(() => {
    if (activeTab !== "insights") return
    setDashboardError(null)
    setDashboardLoading(true)
    getWeeklyDashboard(userId)
      .then((data) => setDashboardData(data))
      .catch((err) => setDashboardError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setDashboardLoading(false))
  }, [activeTab, userId])

  const handleStartListening = async () => {
    connect()
    await new Promise(resolve => setTimeout(resolve, 500))
    await startRealListening()
  }

  const handleStopListening = () => {
    stopRealListening()
  }

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

  const handleBreathingComplete = useCallback(async (feeling?: "calm" | "stressed") => {
    setShowBreathing(false)
    setStressAlert(false)
    if (feeling !== undefined) {
      try {
        await incrementFocusMoments(userId)
      } catch (error) {
        console.error("Failed to increment focus moments:", error)
      }
    }
  }, [userId])

  const handleMoodSelect = useCallback((mood: Mood) => {
    setTodaysMood(mood)
    if (mood === "tough" || mood === "hard") {
      setBreathingContextFlow(mood)
      setBreathingContextExercise(false)
    }
  }, [])

  const handleBreathingContextStart = useCallback(() => {
    setBreathingContextExercise(true)
  }, [])

  const handleBreathingContextMaybeLater = useCallback(() => {
    setBreathingContextFlow(null)
    setBreathingContextExercise(false)
    setActiveTab("home")
  }, [])

  const handleBreathingContextComplete = useCallback(() => {
    setBreathingContextFlow(null)
    setBreathingContextExercise(false)
    setActiveTab("home")
  }, [])

  const handleEmotionChange = useCallback((emotion: "sad" | "happy" | "confused") => {
    if (emotion === "sad" || emotion === "confused") {
      setBreathingContextFlow(emotion)
      setBreathingContextExercise(false)
    }
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

  const isContextFlowActive = breathingContextFlow !== null

  return (
    <div className="min-h-screen bg-background lg:pl-20">
      {/* Manual Breathe button: overlay BreathingExercise (default mode) */}
      <BreathingExercise
        isOpen={showBreathing}
        onClose={() => setShowBreathing(false)}
        onComplete={handleBreathingComplete}
      />

      {/* Full-page context-aware flow: no header/nav until complete or "Maybe later" */}
      {isContextFlowActive && !breathingContextExercise && (
        <BreathingContextPrompt
          context={breathingContextFlow}
          onStart={handleBreathingContextStart}
          onMaybeLater={handleBreathingContextMaybeLater}
        />
      )}
      {isContextFlowActive && breathingContextExercise && (
        <BreathingExercise
          isOpen
          mode="contextual"
          startImmediately
          onClose={handleBreathingContextMaybeLater}
          onComplete={handleBreathingContextComplete}
        />
      )}

      <ContextClueOverlay clue={currentClue} onDismiss={dismissOverlayClue} />

      {!isContextFlowActive && (
        <>
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
                <div className="flex flex-col items-center">
                  <div className="relative mb-6">
                    <div className="flex items-center justify-center gap-[3px] h-16">
                      {Array(16).fill(0).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1 rounded-full transition-all duration-100",
                            isListening ? "bg-primary" : "bg-muted"
                          )}
                          style={{
                            height: `${isListening ? Math.random() * 28 + 4 : 4}px`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={isListening ? handleStopListening : handleStartListening}
                    className={cn(
                      "relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 active:scale-95",
                      isListening
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {isListening ? (
                      <Volume2 className="h-7 w-7" />
                    ) : (
                      <Volume2 className="h-7 w-7 opacity-50" />
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
              </div>

              <MoodTracker
                userId={userId}
                onMoodSelect={handleMoodSelect}
                todaysMood={todaysMood}
              />


              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground mb-1">Mood Analyser</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Use your camera to see how you might be feeling. Stays on this device — nothing is saved or sent.
                </p>
                <FaceEmotionCheck className="mt-0" onEmotionChange={handleEmotionChange} />
              </div>

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

                {isListening && liveTranscript && (
                  <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                      <p className="text-xs font-medium text-primary">Live Transcript</p>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {liveTranscript}
                      <span className="animate-pulse">|</span>
                    </p>
                  </div>
                )}

                {isListening && currentContext && (currentContext.summary || currentContext.tone || currentContext.assessment) && (
                  <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      <p className="text-xs font-medium text-emerald-600">Tone & social cue (Gemini)</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      {(currentContext.tone && currentContext.tone !== 'unknown') && (
                        <p className="text-foreground">
                          <span className="text-muted-foreground">Tone:</span>{' '}
                          <span className="font-medium capitalize">{currentContext.tone}</span>
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        <span className="text-muted-foreground">Vibe:</span>{' '}
                        <span className="capitalize">{currentContext.assessment}</span>
                      </p>
                      {currentContext.summary && (
                        <p className="text-foreground leading-relaxed">{currentContext.summary}</p>
                      )}
                      {currentContext.triggers && currentContext.triggers.length > 0 && (
                        <p className="text-foreground">
                          <span className="text-muted-foreground">Noted:</span>{' '}
                          {currentContext.triggers.join(', ')}
                        </p>
                      )}
                      {currentContext.recommendations && currentContext.recommendations.length > 0 && (
                        <p className="text-emerald-700/90 italic text-xs mt-1">
                          Try: {currentContext.recommendations[0]}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {isListening && !liveTranscript && contextClues.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                      <Volume2 className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <p className="text-sm text-primary">
                      Listening for audio...
                    </p>
                    <p className="text-xs text-primary/70 mt-1">
                      Speak and your transcript will appear
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
          <>
            {dashboardLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-3 text-sm">Loading your week…</p>
              </div>
            )}
            {dashboardError && !dashboardLoading && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-700">
                {dashboardError}
              </div>
            )}
            {!dashboardLoading && !dashboardError && (
              <WeeklyDashboard
                stats={
                  dashboardData
                    ? {
                        moodData: dashboardData.moodDataByDay,
                        breathingBreaks: dashboardData.stats.totalBreathingBreaks,
                        winsLogged: dashboardData.stats.totalWins,
                        signalsSent: 0,
                        topMood: dashboardData.topMood,
                        insight:
                          dashboardData.insights?.[0] ??
                          dashboardData.suggestions?.[0] ??
                          defaultWeeklyStats.insight,
                      }
                    : defaultWeeklyStats
                }
                period={dashboardData?.period}
              />
            )}
          </>
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
        </>
      )}
    </div>
  )
}
