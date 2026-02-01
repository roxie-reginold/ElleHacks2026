"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
    MessageSquare,
    Volume2,
    CheckCircle2,
    XCircle,
    ChevronRight,
    FileText,
    Sparkles
} from "lucide-react"

// Context clue interface
interface ContextClue {
    id: string
    type: "success" | "warning" | "neutral"
    category: string
    originalText: string
    interpretation: string
}

// Sample context clues matching the design
const sampleContextClues: ContextClue[] = [
    {
        id: "1",
        type: "success",
        category: "Teacher",
        originalText: "\"We'll talk later.\"",
        interpretation: "They may be busy, not mad"
    },
    {
        id: "2",
        type: "warning",
        category: "Sound",
        originalText: "Loud Laughter",
        interpretation: "not directed to you\""
    },
    {
        id: "3",
        type: "success",
        category: "Sound",
        originalText: "Loud Laughter",
        interpretation: "Joyful, not directed to you\""
    }
]

interface LessonRecapProps {
    readingLevel?: number
    onGenerateSummary?: (gradeLevel: number) => void
}

export function LessonRecap({
    readingLevel = 8,
    onGenerateSummary
}: LessonRecapProps) {
    const [contextClues] = useState<ContextClue[]>(sampleContextClues)
    const [selectedGrade, setSelectedGrade] = useState(readingLevel)

    const handleGenerateSummary = () => {
        onGenerateSummary?.(selectedGrade)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-adventure"
        >
            {/* Header */}
            <div className="mb-4">
                <h2 className="text-xl font-bold text-foreground">Lesson Recap</h2>
                <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-primary rounded-full" />
                    </div>
                </div>
                <p className="text-primary text-sm mt-2 font-medium">
                    <Sparkles className="inline h-4 w-4 mr-1" />
                    Understanding Unlocked
                </p>
            </div>

            {/* Context Clues Section */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">Context Clues</h3>
                </div>

                <div className="space-y-3">
                    {contextClues.map((clue) => (
                        <motion.div
                            key={clue.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`context-clue-card ${clue.type}`}
                        >
                            <div className="flex-shrink-0">
                                {clue.type === "success" ? (
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                ) : clue.type === "warning" ? (
                                    <XCircle className="h-5 w-5 text-amber-500" />
                                ) : (
                                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">{clue.category}:</span>
                                    <span className="font-medium text-foreground">{clue.originalText}</span>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="text-muted-foreground">Whisper:</span>
                                </div>
                                <p className="text-foreground text-sm mt-0.5">
                                    "{clue.interpretation}
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Generate Summary Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerateSummary}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
            >
                <span>Generate Summary (Grade {selectedGrade})</span>
                <FileText className="h-5 w-5" />
            </motion.button>
        </motion.div>
    )
}

export default LessonRecap
