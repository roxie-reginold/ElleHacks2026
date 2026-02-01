"use client"

import { motion } from "framer-motion"
import {
    Sparkles,
    ChevronRight,
    Zap,
    Heart,
    Leaf
} from "lucide-react"

// Mascot image
const MASCOT_POINTING = "/images/mascot-pointing.png"

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

// Default insights
const defaultInsights: WeeklyInsightData = {
    peakCalm: "Monday Afternoons",
    stressTrigger: "Rapid Speech",
    emotions: {
        calm: 55,
        happy: 15,
        stressed: 5,
        neutral: 25
    },
    levelUp: true,
    encouragement: "You're doing great! Keep up the amazing work!"
}

// Donut chart component
function DonutChart({ data }: { data: EmotionalData }) {
    const total = data.calm + data.happy + data.stressed + data.neutral

    // Calculate stroke-dasharray values for each segment
    const circumference = 2 * Math.PI * 50 // radius = 50

    const calmPercent = (data.calm / total) * 100
    const happyPercent = (data.happy / total) * 100
    const stressedPercent = (data.stressed / total) * 100
    const neutralPercent = (data.neutral / total) * 100

    const calmDash = (calmPercent / 100) * circumference
    const happyDash = (happyPercent / 100) * circumference
    const stressedDash = (stressedPercent / 100) * circumference
    const neutralDash = (neutralPercent / 100) * circumference

    // Offsets for each segment
    const happyOffset = calmDash
    const stressedOffset = calmDash + happyDash
    const neutralOffset = calmDash + happyDash + stressedDash

    return (
        <div className="relative w-40 h-40 mx-auto">
            <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="var(--secondary)"
                    strokeWidth="16"
                />

                {/* Calm segment (green) */}
                <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="16"
                    strokeDasharray={`${calmDash} ${circumference - calmDash}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                />

                {/* Happy segment (light green) */}
                <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#86efac"
                    strokeWidth="16"
                    strokeDasharray={`${happyDash} ${circumference - happyDash}`}
                    strokeDashoffset={`-${happyOffset}`}
                    strokeLinecap="round"
                />

                {/* Stressed segment (amber) - smaller, so less visible */}
                <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="16"
                    strokeDasharray={`${stressedDash} ${circumference - stressedDash}`}
                    strokeDashoffset={`-${stressedOffset}`}
                    strokeLinecap="round"
                />

                {/* Neutral segment (gray-green) */}
                <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#a7f3d0"
                    strokeWidth="16"
                    strokeDasharray={`${neutralDash} ${circumference - neutralDash}`}
                    strokeDashoffset={`-${neutralOffset}`}
                    strokeLinecap="round"
                />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                    <Leaf className="h-6 w-6 text-primary mx-auto mb-1" />
                </div>
            </div>

            {/* Legend labels around the chart */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#86efac]" />
                    {data.happy}%
                </span>
            </div>
            <div className="absolute top-1/2 -right-12 -translate-y-1/2 text-xs text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1">
                    Calm ({data.calm}%)
                </span>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#a7f3d0]" />
                    {data.neutral}%
                </span>
            </div>
            <div className="absolute top-1/2 -left-12 -translate-y-1/2 text-xs text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1">
                    Stress ({data.stressed}%)
                </span>
            </div>
        </div>
    )
}

export function WeeklyInsights() {
    const insights = defaultInsights

    return (
        <div className="relative">
            {/* Background leaf decorations */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <Leaf className="leaf-decoration top-5 right-5 w-20 h-20 rotate-45" />
                <Leaf className="leaf-decoration bottom-10 left-0 w-16 h-16 -rotate-12" />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start gap-6 mb-8">
                    {/* Mascot */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mascot-container hidden lg:block"
                    >
                        <img
                            src={MASCOT_POINTING}
                            alt="Learno Mascot"
                            className="mascot-image animate-float"
                        />
                    </motion.div>

                    {/* Insights Cards */}
                    <div className="flex-1 space-y-4">
                        {/* Peak Calm Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="card-adventure"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                        <Heart className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Peak Calm:</p>
                                        <p className="text-muted-foreground">{insights.peakCalm} <Sparkles className="inline h-3 w-3 text-primary" /></p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </motion.div>

                        {/* Stress Triggers Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="card-adventure"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                                        <Zap className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Stress Triggers:</p>
                                        <p className="text-muted-foreground">{insights.stressTrigger}</p>
                                    </div>
                                </div>
                                <Zap className="h-5 w-5 text-amber-500" />
                            </div>
                        </motion.div>

                        {/* Level Up! */}
                        {insights.levelUp && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                <p className="level-up-text">Level Up!</p>
                            </motion.div>
                        )}
                    </div>

                    {/* Weekly Insights Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex-1"
                    >
                        <h2 className="text-xl font-bold text-foreground mb-6 text-center">
                            Weekly Insights
                        </h2>

                        {/* Emotional Landscape */}
                        <div className="card-adventure">
                            <h3 className="text-center font-semibold text-foreground mb-6">
                                Emotional Landscape
                            </h3>
                            <DonutChart data={insights.emotions} />
                        </div>

                        {/* Mascot - mobile only */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="lg:hidden flex justify-center mt-4"
                        >
                            <img
                                src={MASCOT_POINTING}
                                alt="Learno Mascot"
                                className="w-24 h-auto"
                            />
                        </motion.div>
                    </motion.div>
                </div>

                {/* Encouragement Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="motivation-banner"
                >
                    {insights.encouragement}
                </motion.div>
            </div>
        </div>
    )
}

export default WeeklyInsights
