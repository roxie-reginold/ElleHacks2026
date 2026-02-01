import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Initialize ElevenLabs client for Scribe v2 transcription
const elevenlabs = process.env.ELEVENLABS_API_KEY
  ? new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  : null;

// Initialize OpenRouter client (OpenAI-compatible) for Gemini
const openrouter = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'https://whisper-lite.app',
        'X-Title': 'Whisper Lite',
      },
    })
  : null;

// OpenRouter model for Gemini
const GEMINI_MODEL = 'google/gemini-2.5-flash';

export interface DetectionEvent {
  t: number;
  type: 'fast_speech' | 'laughter_spike' | 'harsh_tone' | 'sarcasm_likely' | 'crowd_noise' | 'urgent_tone' | 'frustrated_tone';
  confidence: number;
  note: string;
}

export interface AnalysisResult {
  detections: {
    overallState: 'calm' | 'stressor_detected' | 'unknown';
    events: DetectionEvent[];
  };
  suggestedPrompt: string;
  uiState: 'green' | 'amber';
  transcript?: string;
}

// Calming prompts library
const CALMING_PROMPTS = [
  "You're safe. This isn't about you.",
  "Breathe with me. In… out…",
  "It's okay to pause. You're doing your best.",
  "Confusing moments happen. You're not in trouble.",
  "Take your time. There's no rush.",
  "You're doing great. Keep going.",
  "This moment will pass. You've got this.",
  "It's okay to feel unsure. That's normal.",
];

/**
 * Transcribe audio using ElevenLabs Scribe v2 API
 * Ref: https://elevenlabs.io/docs/overview/capabilities/speech-to-text
 */
export async function transcribeAudio(audioPath: string): Promise<string> {
  if (!elevenlabs) {
    console.error('No ElevenLabs API key configured - transcription unavailable');
    throw new Error('ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY environment variable.');
  }

  try {
    // Call ElevenLabs Scribe v2 for transcription
    const transcription = await elevenlabs.speechToText.convert({
      file: fs.createReadStream(audioPath),
      modelId: 'scribe_v2',
      languageCode: 'en',
      tagAudioEvents: true,
    });

    const result = transcription as any;
    console.log('ElevenLabs Scribe v2 transcription completed');
    return result.text || '';
  } catch (error: any) {
    console.error('ElevenLabs transcription error:', error);
    throw new Error(`Transcription failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Analyze transcript for stress indicators using Gemini via OpenRouter
 */
export async function analyzeTranscript(
  transcript: string,
  sensitivity: 'low' | 'med' | 'high' = 'med'
): Promise<AnalysisResult> {
  if (!openrouter) {
    console.error('No OpenRouter API key configured - analysis unavailable');
    throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY environment variable.');
  }

  const sensitivityThresholds = {
    low: 'Only flag very obvious and severe stressors',
    med: 'Flag moderate to severe stressors, balanced approach',
    high: 'Flag subtle emotional cues and potential stressors',
  };

  const systemPrompt = `You are an empathetic AI assistant helping neurodivergent students understand classroom audio. 
Your task is to analyze the transcript and identify potential emotional stressors.

Sensitivity level: ${sensitivityThresholds[sensitivity]}

Analyze for:
1. Teacher tone (calm, urgent, frustrated)
2. Fast speech patterns
3. Sudden laughter or crowd noise
4. Sarcasm or harsh tones
5. Emotionally loaded phrases

IMPORTANT: 
- Never use alarming language
- Frame everything supportively
- If nothing concerning, return overallState: "calm" with empty events array
- Notes should be reassuring, e.g., "The teacher sounds busy, not mad at you"

Return JSON with:
- overallState: "calm" | "stressor_detected" | "unknown"
- events: array of { type, confidence, note }`;

  try {
    const response = await openrouter.chat.completions.create({
      model: GEMINI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this classroom audio transcript:\n\n"${transcript}"` },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const responseText = response.choices[0]?.message?.content || '{}';
    
    // Parse JSON response, handling potential markdown code blocks
    let analysis: any;
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                       responseText.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      analysis = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.warn('Failed to parse Gemini JSON response, using default calm state');
      analysis = { overallState: 'calm', events: [] };
    }

    const hasStressors = analysis.events && analysis.events.length > 0;
    
    console.log(`Gemini analysis completed via OpenRouter: ${hasStressors ? 'stressor detected' : 'calm'}`);
    
    return {
      detections: {
        overallState: analysis.overallState || (hasStressors ? 'stressor_detected' : 'calm'),
        events: (analysis.events || []).map((e: any, i: number) => ({
          t: i,
          type: e.type,
          confidence: e.confidence || 0.5,
          note: e.note || 'Analysis detected this pattern.',
        })),
      },
      suggestedPrompt: hasStressors 
        ? CALMING_PROMPTS[Math.floor(Math.random() * CALMING_PROMPTS.length)]
        : '',
      uiState: hasStressors ? 'amber' : 'green',
      transcript,
    };
  } catch (error: any) {
    console.error('Gemini analysis error:', error);
    throw new Error(`Analysis failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Full analysis pipeline: transcribe + analyze
 */
export async function analyzeAudio(
  audioPath: string,
  sensitivity: 'low' | 'med' | 'high' = 'med',
  providedTranscript?: string
): Promise<AnalysisResult> {
  // Use provided transcript or transcribe audio via ElevenLabs Scribe v2
  const transcript = providedTranscript || await transcribeAudio(audioPath);
  
  // Analyze the transcript via Gemini
  return analyzeTranscript(transcript, sensitivity);
}

export default {
  transcribeAudio,
  analyzeTranscript,
  analyzeAudio,
};
