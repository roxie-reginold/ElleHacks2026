/**
 * Gemini Social Context Analysis Service
 * 
 * Uses Google Gemini (via OpenRouter) to interpret classroom audio context for students
 * with social anxiety. Acts as the "brain" that interprets the "ears"
 * (ElevenLabs Scribe v2) data.
 * 
 * Documentation References:
 * - OpenRouter API: https://openrouter.ai/docs
 * - Gemini Models on OpenRouter: https://openrouter.ai/models?q=gemini
 */

import OpenAI from 'openai';
import type { Speaker } from './elevenLabsAudioService';

// Initialize OpenRouter client (OpenAI-compatible)
const openrouter = process.env.OPEN_ROUTER_API_KEY
  ? new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPEN_ROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'https://whisper-lite.app',
        'X-Title': 'Whisper Lite',
      },
    })
  : null;

// OpenRouter model for Gemini
const GEMINI_MODEL = 'google/gemini-flash-1.5';

// ============================================================================
// Types
// ============================================================================

export type EnvironmentAssessment = 'friendly' | 'neutral' | 'tense' | 'unknown';

export interface SocialContextResult {
  success: boolean;
  assessment: EnvironmentAssessment;
  summary: string;           // Calming explanation for the user
  triggers: string[];        // Detected anxiety triggers
  confidence: number;        // 0-1 confidence in assessment
  recommendations: string[]; // Suggested coping strategies
  error?: string;
}

export interface ContextAnalysisInput {
  transcript: string;
  audioEvents: string[];     // ['Laughter', 'Fast_Speech', 'Multiple_Voices']
  speakers: Speaker[];       // Speaker diarization data
  decibels?: number;         // Volume level (optional)
}

// ============================================================================
// Prompts
// ============================================================================

const SOCIAL_CONTEXT_SYSTEM_PROMPT = `You are a compassionate AI assistant helping students with social anxiety understand their classroom environment. Your role is to interpret audio context and provide calming, reassuring explanations.

IMPORTANT GUIDELINES:
1. NEVER use alarming or scary language
2. ALWAYS frame observations supportively
3. Assume positive intent unless clearly negative
4. Provide brief, clear explanations (1-2 sentences)
5. Focus on helping the user feel safe and understood
6. Normalize common classroom sounds and behaviors

AUDIO EVENT INTERPRETATIONS:
- Laughter: Usually means someone told a joke or something funny happened - NOT directed at the user
- Multiple_Voices: Normal classroom chatter, group discussion, or transition time
- Fast_Speech: Teacher may be excited about the topic or running short on time - not anger
- Loud_Voice: Could be emphasis for importance, not necessarily frustration
- Silence: Natural pauses, thinking time, or individual work time

RESPONSE FORMAT:
Provide a JSON response with:
- assessment: 'friendly' | 'neutral' | 'tense' (be conservative - default to 'friendly' or 'neutral')
- summary: A brief, calming explanation (1-2 sentences max)
- triggers: Array of potential anxiety triggers detected (empty if none)
- confidence: 0-1 confidence level
- recommendations: 1-2 brief coping suggestions if needed`;

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Analyze social context of classroom audio using Gemini via OpenRouter.
 * 
 * Takes transcript and audio events from ElevenLabs Scribe v2 and
 * provides a calming interpretation for students with social anxiety.
 * 
 * @param input - Transcript, audio events, and speaker data
 * @returns Social context analysis with calming summary
 */
export async function analyzeSocialContext(
  input: ContextAnalysisInput
): Promise<SocialContextResult> {
  if (!openrouter) {
    console.log('No OpenRouter API key, social context analysis unavailable');
    return {
      success: false,
      assessment: 'unknown',
      summary: 'Analysis unavailable - please configure OpenRouter API key',
      triggers: [],
      confidence: 0,
      recommendations: [],
      error: 'OpenRouter API key not configured',
    };
  }

  const { transcript, audioEvents, speakers, decibels } = input;

  try {
    // Build context string for Gemini
    const speakerInfo = speakers.length > 0
      ? `Speakers detected: ${speakers.length} (${speakers.map(s => s.label).join(', ')})`
      : 'Speaker information not available';

    const volumeInfo = decibels !== undefined
      ? `Volume level: ${decibels} dB`
      : '';

    const userPrompt = `Analyze this classroom audio context for a student with social anxiety:

AUDIO EVENTS DETECTED: ${audioEvents.length > 0 ? audioEvents.join(', ') : 'None'}

TRANSCRIPT: "${transcript || 'No speech detected'}"

${speakerInfo}
${volumeInfo}

Provide a calming interpretation. Remember:
- The student may be worried that sounds are directed at them
- Help them understand the context is likely normal/safe
- Be reassuring but honest

Respond in JSON format with: assessment, summary, triggers, confidence, recommendations`;

    // Call Gemini via OpenRouter
    const response = await openrouter.chat.completions.create({
      model: GEMINI_MODEL,
      messages: [
        { role: 'system', content: SOCIAL_CONTEXT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,  // Lower temperature for consistent, calm responses
      response_format: { type: 'json_object' },
    });

    // Parse response
    const responseText = response.choices[0]?.message?.content || '{}';
    let parsed: any;
    
    try {
      // Handle potential markdown code blocks in response
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                       responseText.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      parsed = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.warn('Failed to parse Gemini JSON response, using defaults');
      parsed = {};
    }

    // Validate and normalize response
    const assessment = validateAssessment(parsed.assessment);
    const summary = parsed.summary || generateDefaultSummary(audioEvents, transcript);
    const triggers = Array.isArray(parsed.triggers) ? parsed.triggers : [];
    const confidence = typeof parsed.confidence === 'number' 
      ? Math.min(1, Math.max(0, parsed.confidence)) 
      : 0.7;
    const recommendations = Array.isArray(parsed.recommendations) 
      ? parsed.recommendations 
      : [];

    console.log(`Social context analysis: ${assessment} (${(confidence * 100).toFixed(0)}% confidence)`);

    return {
      success: true,
      assessment,
      summary,
      triggers,
      confidence,
      recommendations,
    };
  } catch (error: any) {
    console.error('Gemini analysis error:', error);
    
    // Return a safe fallback response
    return {
      success: false,
      assessment: 'neutral',
      summary: "I couldn't fully analyze the audio, but classrooms typically have normal sounds that aren't directed at you.",
      triggers: [],
      confidence: 0.3,
      recommendations: ['Take a deep breath', 'Focus on your own space'],
      error: error.message || 'Analysis failed',
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate and normalize assessment value.
 * Defaults to 'neutral' if invalid.
 */
function validateAssessment(value: any): EnvironmentAssessment {
  const validAssessments: EnvironmentAssessment[] = ['friendly', 'neutral', 'tense'];
  if (validAssessments.includes(value)) {
    return value;
  }
  return 'neutral';  // Safe default
}

/**
 * Generate a default calming summary based on audio events.
 * Used as fallback if Gemini response is incomplete.
 */
function generateDefaultSummary(audioEvents: string[], transcript: string): string {
  if (audioEvents.includes('Laughter')) {
    return "There's laughter in the room - likely someone shared something funny. It's not about you.";
  }
  
  if (audioEvents.includes('Multiple_Voices')) {
    return "Multiple people are talking - this is normal classroom discussion or transition time.";
  }
  
  if (audioEvents.includes('Fast_Speech')) {
    return "Someone is speaking quickly - they may be excited about the topic or have a lot to share.";
  }
  
  if (audioEvents.includes('Silence')) {
    return "It's quiet right now - this is normal thinking or working time.";
  }
  
  if (transcript && transcript.length > 0) {
    return "The classroom sounds normal. Focus on your own work and take things one step at a time.";
  }
  
  return "The environment seems calm. You're doing fine.";
}

// ============================================================================
// Quick Analysis (Simplified)
// ============================================================================

/**
 * Quick analysis for specific audio events.
 * Use when you just need to interpret a specific event quickly.
 * 
 * @param event - Single audio event type
 * @returns Quick calming interpretation
 */
export function getQuickEventInterpretation(event: string): string {
  const interpretations: Record<string, string> = {
    'Laughter': "The class laughed - likely at a joke or something funny. Not at you.",
    'Applause': "People are clapping - probably celebrating something positive!",
    'Multiple_Voices': "Several people talking - normal group activity or discussion.",
    'Fast_Speech': "Quick talking - excitement or enthusiasm, not anger.",
    'Loud_Voice': "Louder voice - probably for emphasis. Teachers do this to make points clear.",
    'Silence': "Quiet moment - normal pause for thinking or individual work.",
    'Music': "Music playing - probably a planned activity or break time.",
    'Coughing': "Someone coughed - just a normal body thing, nothing to worry about.",
    'Background_Noise': "Some background noise - typical classroom sounds.",
  };

  return interpretations[event] || `${event} detected - this is likely a normal classroom sound.`;
}

// ============================================================================
// Batch Analysis (for Dashboard)
// ============================================================================

/**
 * Analyze patterns in context events for dashboard insights.
 * 
 * @param events - Array of past context analysis results
 * @returns Pattern summary and trends
 */
export async function analyzePatterns(
  events: SocialContextResult[]
): Promise<{
  overallTrend: EnvironmentAssessment;
  commonTriggers: string[];
  positivePatterns: string[];
  suggestions: string[];
}> {
  if (events.length === 0) {
    return {
      overallTrend: 'neutral',
      commonTriggers: [],
      positivePatterns: [],
      suggestions: ['Start listening to build your pattern history'],
    };
  }

  // Calculate assessment distribution
  const assessments = events.map(e => e.assessment);
  const friendlyCount = assessments.filter(a => a === 'friendly').length;
  const tenseCount = assessments.filter(a => a === 'tense').length;
  
  let overallTrend: EnvironmentAssessment = 'neutral';
  if (friendlyCount > events.length * 0.6) overallTrend = 'friendly';
  if (tenseCount > events.length * 0.3) overallTrend = 'tense';

  // Find common triggers
  const allTriggers = events.flatMap(e => e.triggers);
  const triggerCounts = allTriggers.reduce((acc, t) => {
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const commonTriggers = Object.entries(triggerCounts)
    .filter(([_, count]) => count >= 2)
    .map(([trigger]) => trigger);

  // Identify positive patterns
  const positivePatterns: string[] = [];
  if (friendlyCount > events.length * 0.5) {
    positivePatterns.push('Your classroom environment is generally friendly');
  }
  if (tenseCount === 0) {
    positivePatterns.push('No tense moments detected recently');
  }

  // Generate suggestions
  const suggestions: string[] = [];
  if (commonTriggers.includes('Laughter')) {
    suggestions.push('Laughter is common and usually positive - try to enjoy it!');
  }
  if (commonTriggers.includes('Multiple_Voices')) {
    suggestions.push('Group discussions are normal - you can participate at your own pace');
  }

  return {
    overallTrend,
    commonTriggers,
    positivePatterns,
    suggestions,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  analyzeSocialContext,
  getQuickEventInterpretation,
  analyzePatterns,
};
