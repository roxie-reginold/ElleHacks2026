"use client"

import { useState, useCallback, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Navigation } from "@/components/ui/Navigation"
import { useUser } from "@/context/UserContext"
import { BreathingExercise } from "@/components/BreathingExercise"
import { BreathingContextPrompt } from "@/components/BreathingContextPrompt"
import { MoodTracker, type Mood } from "@/components/MoodTracker"
import { FaceEmotionCheck } from "@/components/FaceEmotionCheck"
import { TeacherSignal } from "@/components/TeacherSignal"
import { CourageClips, type CourageClip } from "@/components/CourageClips"
import { FloatingMascot } from "@/components/Mascot"
import { useContextListener } from "@/hooks/useContextListener"
import {
  Wind,
  Sparkles,
  Heart,
  MessageCircle,
  X,
  Volume2,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  Leaf,
  Play,
  FileText,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Zap,
  Square
} from "lucide-react"
import { cn } from "@/lib/utils"
import { incrementFocusMoments } from "@/services/api"
import type { ContextLabel } from "@/types/breathing"
import { motion } from "framer-motion"

// Mascot images
const MASCOT_IMAGE = "/images/mascot.png"
const MASCOT_POINTING = "/images/mascot-pointing.png"

// Dashboard stats
interface DashboardStats {
  classroomAdventures: number
  mindfulMomentsProgress: number
  weeklyProgress: number[]
  dailyQuestsCompleted: boolean
}

// Emotional data interface  
interface EmotionalData {
  calm: number
  happy: number
  stressed: number
  neutral: number
}

// Weekly insight interface  
interface WeeklyInsightData {
  peakCalm: string
  stressTrigger: string
  emotions: EmotionalData
  levelUp: boolean
  encouragement: string
}

// Default data
const defaultStats: DashboardStats = {
  classroomAdventures: 3,
  mindfulMomentsProgress: 75,
  weeklyProgress: [30, 45, 60, 55, 70, 80, 75],
  dailyQuestsCompleted: true
}

const defaultInsights: WeeklyInsightData = {
  peakCalm: "Monday Afternoons",
  stressTrigger: "Rapid Speech",
  emotions: { calm: 55, happy: 15, stressed: 5, neutral: 25 },
  levelUp: true,
  encouragement: "You're doing great! Keep up the amazing work!"
}

// Donut chart component
function DonutChart({ data }: { data: EmotionalData }) {
  const total = data.calm + data.happy + data.stressed + data.neutral
  const circumference = 2 * Math.PI * 45
  const calmPercent = (data.calm / total) * 100
  const happyPercent = (data.happy / total) * 100
  const stressedPercent = (data.stressed / total) * 100

  const calmDash = (calmPercent / 100) * circumference
  const happyDash = (happyPercent / 100) * circumference
  const stressedDash = (stressedPercent / 100) * circumference
  const happyOffset = calmDash
  const stressedOffset = calmDash + happyDash

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--secondary)" strokeWidth="10" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--primary)" strokeWidth="10"
          strokeDasharray={`${calmDash} ${circumference - calmDash}`} strokeDashoffset="0" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="#86efac" strokeWidth="10"
          strokeDasharray={`${happyDash} ${circumference - happyDash}`} strokeDashoffset={`-${happyOffset}`} />
        <circle cx="50" cy="50" r="45" fill="none" stroke="#fbbf24" strokeWidth="10"
          strokeDasharray={`${stressedDash} ${circumference - stressedDash}`} strokeDashoffset={`-${stressedOffset}`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Leaf className="h-5 w-5 text-primary" />
      </div>
    </div>
  )
}

export default function App() {
  const { user, updatePreferences } = useUser()
  const navigate = useNavigate()
  const userId = user?._id || 'demo-user'

  const [activeTab, setActiveTab] = useState("home")
  const [showBreathing, setShowBreathing] = useState(false)
  const [todaysMood, setTodaysMood] = useState<Mood | null>(null)
  const [stressAlert, setStressAlert] = useState(false)
  const [courageClips, setCourageClips] = useState<CourageClip[]>([])
  const [breathingContextFlow, setBreathingContextFlow] = useState<ContextLabel | null>(null)
  const [breathingContextExercise, setBreathingContextExercise] = useState(false)
  const [stats] = useState<DashboardStats>(defaultStats)
  const [insights] = useState<WeeklyInsightData>(defaultInsights)

  // Real-time ElevenLabs transcription + Gemini tone/social cue analysis
  const {
    isConnected,
    isStreaming,
    liveTranscript,
    currentContext,
    recentEvents,
    audioLevel,
    startListening: startRealListening,
    stopListening: stopRealListening,
    connect,
    error: contextError,
  } = useContextListener({
    userId,
    autoConnect: false,
    mode: 'streaming',
  })

  const handleStartListening = async () => {
    if (!isConnected) {
      connect()
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    await startRealListening()
  }

  const handleStopListening = () => {
    stopRealListening()
  }

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
  }, [])

  const handleEmotionChange = useCallback((emotion: "sad" | "happy" | "confused") => {
    if (emotion === "sad" || emotion === "confused") {
      setBreathingContextFlow(emotion)
      setBreathingContextExercise(false)
    }
  }, [])

  const handleSaveClip = useCallback((clip: CourageClip | Omit<CourageClip, "id" | "createdAt">) => {
    const newClip: CourageClip = 'id' in clip && clip.id
      ? clip as CourageClip
      : { ...clip, id: Date.now().toString(), createdAt: new Date() } as CourageClip
    setCourageClips(prev => prev.some(c => c.id === newClip.id) ? prev : [...prev, newClip])
  }, [])

  const handleBreathingContextStart = useCallback(() => {
    setBreathingContextExercise(true)
  }, [])

  const handleBreathingContextMaybeLater = useCallback(() => {
    setBreathingContextFlow(null)
    setBreathingContextExercise(false)
  }, [])

  const handleBreathingContextComplete = useCallback(() => {
    setBreathingContextFlow(null)
    setBreathingContextExercise(false)
    setActiveTab("home")
  }, [])

  const handleTeacherSignal = useCallback((_type: "question" | "slow" | "help") => { }, [])

  const handleClipsChange = useCallback((clips: CourageClip[]) => {
    setCourageClips(clips)
  }, [])

  const isContextFlowActive = breathingContextFlow !== null

  // Check for stress triggers from context
  useEffect(() => {
    if (currentContext?.assessment === 'tense' || currentContext?.triggers?.length) {
      setStressAlert(true)
    }
  }, [currentContext])

  return (
    <div className="min-h-screen bg-background lg:pl-20">
      <BreathingExercise
        isOpen={showBreathing}
        onClose={() => setShowBreathing(false)}
        onComplete={handleBreathingComplete}
      />

      {isContextFlowActive && !breathingContextExercise && (
        <BreathingContextPrompt
          context={breathingContextFlow}
          onStart={handleBreathingContextStart}
          onMaybeLater={handleBreathingContextMaybeLater}
        />
      )}
      {isContextFlowActive && breathingContextExercise && (
        <BreathingExercise
          isOpen={true}
          mode="contextual"
          startImmediately={true}
          onClose={handleBreathingContextMaybeLater}
          onComplete={handleBreathingContextComplete}
        />
      )}

      {!isContextFlowActive && (
        <>
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 lg:px-8 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Leaf className="h-6 w-6 text-primary" />
                </div>
                <span className="font-bold text-xl text-foreground">Learno</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBreathing(true)}
                  className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary/20 hover:shadow-md active:scale-95"
                >
                  <Wind className="h-4 w-4" />
                  Breathe
                </button>
                <Link
                  to="/teacher-dashboard"
                  onClick={(e) => {
                    if (user?.role !== "teacher") {
                      e.preventDefault()
                      updatePreferences({ role: "teacher" }).then(() => navigate("/teacher-dashboard"))
                    }
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline transition-colors"
                >
                  Teacher view
                </Link>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 lg:px-8 py-6 pb-28 lg:pb-8">
            {/* Background leaf decorations */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
              <Leaf className="absolute top-20 right-10 w-32 h-32 text-primary/10 rotate-45" />
              <Leaf className="absolute bottom-40 left-5 w-24 h-24 text-primary/10 -rotate-12" />
            </div>

            {activeTab === "home" && (
              <div className="relative z-10 flex flex-col lg:flex-row gap-6">
                {/* LEFT COLUMN */}
                <div className="flex-1 lg:max-w-xl space-y-5">
                  {/* Welcome Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <h1 className="text-lg font-semibold text-foreground mb-1">
                      Welcome back
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      How can I support you today?
                    </p>
                  </motion.div>

                  {/* Context Listener Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="text-center mb-4">
                      <h2 className="font-semibold text-foreground">Context Listener</h2>
                      <p className="text-sm text-muted-foreground">Helps understand social cues</p>
                    </div>

                    {/* Audio Visualizer */}
                    <div className="flex flex-col items-center">
                      <div className="relative mb-6">
                        <div className="flex items-center justify-center gap-[3px] h-16">
                          {Array(16).fill(0).map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                "w-1 rounded-full transition-all duration-100",
                                isStreaming ? "bg-primary" : "bg-muted"
                              )}
                              style={{
                                height: isStreaming
                                  ? `${Math.max(4, audioLevel * 64 + Math.random() * 16)}px`
                                  : "4px",
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Start/Stop Button */}
                      <button
                        onClick={isStreaming ? handleStopListening : handleStartListening}
                        className={cn(
                          "relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 active:scale-95",
                          isStreaming
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        )}
                      >
                        {isStreaming ? (
                          <Volume2 className="h-7 w-7" />
                        ) : (
                          <Volume2 className="h-7 w-7 opacity-50" />
                        )}

                        {isStreaming && (
                          <>
                            <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                            <span className="absolute -inset-2 rounded-full border-2 border-primary/20 animate-pulse" />
                          </>
                        )}
                      </button>

                      <p className="mt-4 text-sm text-muted-foreground">
                        {isStreaming ? "Listening for social cues..." : "Tap to start context listener"}
                      </p>

                      {contextError && (
                        <p className="mt-2 text-sm text-destructive">{contextError}</p>
                      )}
                    </div>
                  </motion.div>

                  {/* Mood Tracker */}
                  <MoodTracker
                    userId={userId}
                    onMoodSelect={handleMoodSelect}
                    todaysMood={todaysMood}
                  />

                  {/* Teacher Signal */}
                  <TeacherSignal onSignal={handleTeacherSignal} />

                  {/* Face Emotion Check */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <h3 className="font-semibold text-foreground mb-1">Mood Analyser</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Use your camera to see how you might be feeling. Stays on this device — nothing is saved or sent.
                    </p>
                    <FaceEmotionCheck className="mt-0" onEmotionChange={handleEmotionChange} />
                  </motion.div>
                </div>

                {/* Floating Mascot for Today page */}
                <FloatingMascot
                  variant="small"
                  className="fixed bottom-32 right-6 lg:bottom-28 lg:right-8 z-20"
                  message="I'm here to help! 💚"
                />

                {/* RIGHT COLUMN - Context Clues Panel */}
                <div className="lg:w-96 lg:sticky lg:top-20 lg:self-start">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "rounded-2xl border-2 border-dashed p-5 min-h-[400px] transition-all duration-300",
                      isStreaming
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-card/50"
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className={cn(
                        "h-2.5 w-2.5 rounded-full transition-colors",
                        isStreaming ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                      )} />
                      <h3 className={cn(
                        "text-sm font-medium transition-colors",
                        isStreaming ? "text-primary" : "text-muted-foreground"
                      )}>
                        {isStreaming ? "Listening for context clues..." : "Context Clues"}
                      </h3>
                    </div>

                    {/* Stress Alert */}
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

                    {/* Not Listening State */}
                    {!isStreaming && (
                      <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                          <Volume2 className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Tap &quot;Start Listening&quot; to detect social cues
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Tone &amp; social cue (Gemini) will appear here when listening
                        </p>
                      </div>
                    )}

                    {/* Live Transcript (when listening) */}
                    {isStreaming && liveTranscript && (
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

                    {/* Context Analysis (Gemini) */}
                    {isStreaming && currentContext && (currentContext.summary || currentContext.tone || currentContext.assessment) && (
                      <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-emerald-500" />
                          <p className="text-xs font-medium text-emerald-600">Tone & social cue (Gemini)</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          {currentContext.tone && currentContext.tone !== 'unknown' && (
                            <p className="text-foreground">
                              <span className="text-muted-foreground">Vibe:</span>{' '}
                              <span className="font-medium capitalize">{currentContext.tone}</span>
                            </p>
                          )}
                          {currentContext.assessment && (
                            <p className="text-muted-foreground">
                              It sounds like someone in the classroom is feeling {currentContext.tone || 'something'}.{' '}
                              This is likely a personal expression and not directed at you.
                            </p>
                          )}
                          {currentContext.triggers && currentContext.triggers.length > 0 && (
                            <p className="text-foreground">
                              <span className="text-muted-foreground">Noted:</span>{' '}
                              {currentContext.triggers.join(', ')}
                            </p>
                          )}
                          {currentContext.recommendations && currentContext.recommendations.length > 0 && (
                            <p className="text-emerald-700/90 italic text-xs mt-2">
                              Try: {currentContext.recommendations[0]}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Social Cue Cards */}
                    {isStreaming && currentContext?.summary && (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageCircle className="h-4 w-4 text-primary" />
                          <p className="text-xs font-medium text-primary">Social cue</p>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {currentContext.summary}
                        </p>
                      </div>
                    )}

                    {/* Listening but no transcript yet */}
                    {isStreaming && !liveTranscript && !currentContext?.summary && (
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
                  </motion.div>
                </div>
              </div>
            )}

            {activeTab === "insights" && (
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN - Dashboard with Mascot */}
                <div className="space-y-6">
                  <div className="flex gap-6">
                    {/* Mascot */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="hidden md:block flex-shrink-0"
                    >
                      <img
                        src={MASCOT_IMAGE}
                        alt="Learno Mascot"
                        className="w-36 h-auto drop-shadow-lg"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    </motion.div>

                    {/* Dashboard Cards */}
                    <div className="flex-1 space-y-4">
                      <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-bold text-foreground"
                      >
                        Dashboard
                      </motion.h1>

                      {/* Classroom Adventures Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-2xl bg-card border border-border p-5 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                              <BookOpen className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">Classroom Adventures</h3>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Sparkles className="h-5 w-5 text-primary" />
                            </div>
                            <button
                              onClick={isStreaming ? handleStopListening : handleStartListening}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:bg-primary/90 active:scale-95 transition-all"
                            >
                              <Play className="h-4 w-4" />
                              {isStreaming ? "Stop" : "Start"}
                            </button>
                          </div>
                        </div>
                      </motion.div>

                      {/* Mindful Moments Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="rounded-2xl bg-card border border-border p-5 shadow-sm"
                      >
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <span className="text-xl">🧘</span>
                          </div>
                          <h3 className="font-semibold text-foreground">Mindful Moments</h3>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <span className="text-sm">🌱</span>
                          </div>
                          <div className="flex-1">
                            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                                style={{ width: `${stats.mindfulMomentsProgress}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium text-primary">
                            {stats.mindfulMomentsProgress}% Complete
                          </span>
                        </div>
                      </motion.div>

                      {/* Daily Quests */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-muted-foreground text-sm italic">Daily Quests</span>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm border border-primary/20">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Completed!</span>
                        </div>
                      </motion.div>

                      {/* Weekly Progress Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="rounded-2xl bg-card border border-border p-5 shadow-sm"
                      >
                        <h3 className="font-semibold text-foreground mb-4">Weekly Progress</h3>
                        <div className="flex items-end justify-between h-20 gap-2">
                          {stats.weeklyProgress.map((value, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-lg transition-all duration-500"
                                style={{ height: `${value}%` }}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end mt-3">
                          <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN - Lesson Recap */}
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-card border border-border p-5 shadow-sm"
                  >
                    {/* Header */}
                    <div className="mb-4">
                      <h2 className="text-xl font-bold text-foreground">Lesson Recap</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full w-3/4 bg-primary rounded-full" />
                        </div>
                      </div>
                      <p className="text-primary text-sm mt-2 font-medium flex items-center gap-1">
                        <Sparkles className="h-4 w-4" />
                        Understanding Unlocked
                      </p>
                    </div>

                    {/* Context Clues Section */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <MessageCircle className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground">Context Clues</h3>
                      </div>

                      <div className="space-y-3">
                        {/* Live context clues or sample clues */}
                        {(currentContext?.summary ? [{
                          id: 'live',
                          type: 'success' as const,
                          category: 'Live',
                          originalText: liveTranscript || 'Listening...',
                          interpretation: currentContext.summary
                        }] : [
                          { id: "1", type: "success" as const, category: "Teacher", originalText: "\"We'll talk later.\"", interpretation: "They may be busy, not mad" },
                          { id: "2", type: "warning" as const, category: "Sound", originalText: "Loud Laughter", interpretation: "not directed to you" },
                          { id: "3", type: "success" as const, category: "Sound", originalText: "Loud Laughter", interpretation: "Joyful, not directed to you" }
                        ]).map((clue) => (
                          <div
                            key={clue.id}
                            className={cn(
                              "flex items-start gap-3 p-4 rounded-xl transition-all duration-200",
                              clue.type === "success" ? "bg-primary/10 border border-primary/30" :
                                clue.type === "warning" ? "bg-amber-50 border border-amber-200" :
                                  "bg-muted/50"
                            )}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              {clue.type === "success" ? (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              ) : (
                                <XCircle className="h-5 w-5 text-amber-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1 text-sm">
                                <span className="text-muted-foreground">{clue.category}:</span>
                                <span className="font-medium text-foreground">{clue.originalText}</span>
                                <span className="text-muted-foreground">→ Whisper:</span>
                              </div>
                              <p className="text-foreground text-sm mt-0.5">
                                "{clue.interpretation}"
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Generate Summary Button */}
                    <button
                      className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:bg-primary/90 active:scale-[0.98] transition-all duration-200"
                    >
                      <span>Generate Summary (Grade 8)</span>
                      <FileText className="h-5 w-5" />
                    </button>
                  </motion.div>

                  {/* Weekly Insights mini section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl bg-card border border-border p-5 shadow-sm"
                  >
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" />
                      Weekly Insights
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-primary/5 p-3 border border-primary/20">
                        <p className="text-xs text-muted-foreground">Peak Calm</p>
                        <p className="text-sm font-medium text-foreground">{insights.peakCalm}</p>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-3 border border-amber-200">
                        <p className="text-xs text-muted-foreground">Stress Trigger</p>
                        <p className="text-sm font-medium text-foreground">{insights.stressTrigger}</p>
                      </div>
                    </div>

                    {/* Level Up animation */}
                    <div className="mt-4 text-center">
                      <span className="text-2xl font-bold bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent">
                        Level Up! 🎉
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {activeTab === "courage" && (
              <CourageClips
                userId={userId}
                clips={courageClips}
                onClipsChange={handleClipsChange}
                onSaveClip={handleSaveClip}
              />
            )}

            {activeTab === "help" && (
              <div className="relative z-10 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Support</h2>
                    <p className="text-sm text-muted-foreground">Tools to help you through tough moments</p>
                  </div>
                  <FloatingMascot
                    variant="pointing"
                    className="relative hidden md:flex"
                    message="You've got this! 🌟"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <TeacherSignal onSignal={handleTeacherSignal} />
                  </div>

                  <div className="lg:col-span-1 rounded-2xl border border-border bg-card p-5">
                    <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowBreathing(true)}
                        className="flex w-full items-center gap-4 rounded-xl bg-primary/5 border border-primary/20 p-4 text-left transition-all hover:bg-primary/10 hover:shadow-md active:scale-[0.98]"
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
                        className="flex w-full items-center gap-4 rounded-xl bg-secondary p-4 text-left transition-all hover:bg-secondary/80 hover:shadow-md active:scale-[0.98]"
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

                  <div className="lg:col-span-1 rounded-2xl border border-pink-200 bg-pink-50/50 p-5 h-fit">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-100">
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
      )
      }
    </div >
  )
}
