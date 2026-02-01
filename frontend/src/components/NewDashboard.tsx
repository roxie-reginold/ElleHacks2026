"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
    BookOpen,
    Sparkles,
    TrendingUp,
    Leaf,
    ChevronRight,
    Play,
    FileText
} from "lucide-react"

// Mascot images
const MASCOT_IMAGE = "/images/mascot.png"
const MASCOT_POINTING = "/images/mascot-pointing.png"

// Dashboard stats interface
interface DashboardStats {
    classroomAdventures: number
    mindfulMomentsProgress: number
    weeklyProgress: number[]
    dailyQuestsCompleted: boolean
}

// Default stats
const defaultStats: DashboardStats = {
    classroomAdventures: 3,
    mindfulMomentsProgress: 75,
    weeklyProgress: [30, 45, 60, 55, 70, 80, 75],
    dailyQuestsCompleted: true
}

export function NewDashboard() {
    const [stats] = useState<DashboardStats>(defaultStats)

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Background leaf decorations */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <Leaf className="leaf-decoration top-10 right-10 w-32 h-32 rotate-45" />
                <Leaf className="leaf-decoration bottom-20 left-5 w-24 h-24 -rotate-12" />
                <Leaf className="leaf-decoration top-1/3 left-1/4 w-16 h-16 rotate-90" />
            </div>

            <div className="relative z-10 p-6 lg:p-8 max-w-7xl mx-auto">
                {/* Header with Mascot */}
                <div className="flex items-start gap-6 mb-8">
                    {/* Mascot */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mascot-container hidden lg:block"
                    >
                        <img
                            src={MASCOT_IMAGE}
                            alt="Learno Mascot"
                            className="mascot-image-large animate-float"
                        />
                    </motion.div>

                    {/* Dashboard Title & Cards */}
                    <div className="flex-1">
                        <motion.h1
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-bold text-foreground mb-6"
                        >
                            Dashboard
                        </motion.h1>

                        {/* Classroom Adventures Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="card-adventure mb-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                                        <BookOpen className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground">Classroom Adventures</h3>
                                        <p className="text-sm text-muted-foreground">{stats.classroomAdventures} lessons completed</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <Sparkles className="h-5 w-5 text-primary" />
                                    </div>
                                    <button className="btn-primary">
                                        <Play className="h-4 w-4" />
                                        Start
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Mindful Moments Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="card-adventure mb-4"
                        >
                            <div className="flex items-center gap-4 mb-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    <span className="text-xl">🧘</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Mindful Moments</h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                    <span className="text-sm">🌱</span>
                                </div>
                                <div className="flex-1">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-bar-fill"
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
                            className="mb-4"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-muted-foreground text-sm italic">Daily Quests</span>
                                <div className="quest-badge">
                                    <Leaf className="h-4 w-4" />
                                    <span>Completed!</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Weekly Progress Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="card-adventure"
                        >
                            <h3 className="font-semibold text-foreground mb-4">Weekly Progress</h3>
                            <div className="flex items-end justify-between h-24 gap-2">
                                {stats.weeklyProgress.map((value, index) => (
                                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                        <div
                                            className="w-full bg-gradient-to-t from-primary to-primary-light rounded-lg transition-all duration-500"
                                            style={{ height: `${value}%` }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-2">
                                <span className="text-xs text-muted-foreground">Mon</span>
                                <span className="text-xs text-muted-foreground">Sun</span>
                            </div>
                            <div className="flex justify-end mt-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default NewDashboard
