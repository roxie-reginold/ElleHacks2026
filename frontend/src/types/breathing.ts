/**
 * Context labels that trigger the context-aware breathing flow.
 * Maps from MoodTracker (tough/hard), FaceEmotionCheck (sad/confused), and future sources (e.g. overwhelmed).
 */
export type ContextLabel = "sad" | "confused" | "overwhelmed" | "tough" | "hard"

/** Message shown matches the actual emotion (sad = sad, confused = confused, etc.). */
const PROMPT_MAP: Record<ContextLabel, string> = {
  sad: "I notice you're feeling sad. Let's take some deep breaths.",
  confused: "I notice you're feeling confused. Let's take some deep breaths.",
  overwhelmed: "I notice you're feeling overwhelmed. Let's take some deep breaths.",
  tough: "I notice you're having a tough time. Let's take some deep breaths.",
  hard: "I notice things feel hard right now. Let's take some deep breaths.",
}

const FALLBACK_PROMPT = "I notice you're not quite yourself. Let's take some deep breaths."

export function getContextPrompt(context: ContextLabel): string {
  return PROMPT_MAP[context] ?? FALLBACK_PROMPT
}
