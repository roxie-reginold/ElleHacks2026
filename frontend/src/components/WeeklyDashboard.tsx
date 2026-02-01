"use client"

import { Wind, Trophy, Heart, Sparkles, TrendingUp, Calendar } from "lucide-react"

/** Hardcoded values for the Insights / Your Week view */
const DEFAULT_STATS = {
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
} as const

const moodEmojis: Record<number, string> = {
  1: "\u{1F622}",
  2: "\u{1F614}",
  3: "\u{1F610}",
  4: "\u{1F60A}",
  5: "\u{1F929}",
}

export function WeeklyDashboard() {
  const stats = DEFAULT_STATS
  const maxMood = 5

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Your Week</h2>
          <p className="text-sm text-muted-foreground">Jan 27 - Feb 2</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>7 days</span>
        </div>
      </div>

      {/* Top Row - AI Insight + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
                Weekly Insight
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {stats.insight}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{moodEmojis[4]}</span>
            <div>
              <p className="font-medium text-foreground">Most common: {stats.topMood}</p>
              <p className="text-sm text-muted-foreground">You felt good most days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row - Mood Timeline + Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Mood Timeline</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span>Trending up</span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-3 h-32">
            {stats.moodData.map((day, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xl">{moodEmojis[day.mood] || moodEmojis[3]}</span>
                <div className="relative w-full flex justify-center">
                  <div
                    className="w-full max-w-[32px] rounded-lg bg-primary/80 transition-all"
                    style={{ height: `${(day.mood / maxMood) * 64}px` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {day.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Wind className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats.breathingBreaks}</p>
                <p className="text-xs text-muted-foreground">Breathing breaks</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warm/10">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats.winsLogged}</p>
                <p className="text-xs text-muted-foreground">Wins logged</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gentle/10">
                <Heart className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stats.signalsSent}</p>
                <p className="text-xs text-muted-foreground">Help requests</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Kind Words */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gentle/10">
            <Heart className="h-5 w-5 text-pink-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-2">Kind Words for You</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This week you showed up for yourself {stats.breathingBreaks} times with breathing breaks.
              You reached out when you needed help, and that takes courage. Remember: every small step counts.
              You&apos;re doing better than you think. Keep going - you&apos;ve got this!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
