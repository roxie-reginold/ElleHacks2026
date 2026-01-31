import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Initialize OpenAI client (will be null if no API key)
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeAudio(audioPath: string): Promise<string> {
  if (!openai) {
    console.log('No OpenAI API key, using mock transcription');
    return getMockTranscript();
  }

  try {
    const audioFile = fs.createReadStream(audioPath);
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    });
    return response.text;
  } catch (error) {
    console.error('Transcription error:', error);
    return getMockTranscript();
  }
}

/**
 * Analyze transcript for stress indicators using GPT-4
 */
export async function analyzeTranscript(
  transcript: string,
  sensitivity: 'low' | 'med' | 'high' = 'med'
): Promise<AnalysisResult> {
  if (!openai) {
    console.log('No OpenAI API key, using mock analysis');
    return getMockAnalysis(transcript);
  }

  const sensitivityThresholds = {
    low: 'Only flag very obvious and severe stressors',
    med: 'Flag moderate to severe stressors, balanced approach',
    high: 'Flag subtle emotional cues and potential stressors',
  };

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an empathetic AI assistant helping neurodivergent students understand classroom audio. 
Your task is to analyze the transcript and identify potential emotional stressors.

Sensitivity level: ${sensitivityThresholds[sensitivity]}

Analyze for:
1. Teacher tone (calm, urgent, frustrated)
2. Fast speech patterns
3. Sudden laughter or crowd noise
4. Sarcasm or harsh tones
5. Emotionally loaded phrases

Respond in JSON format:
{
  "overallState": "calm" | "stressor_detected",
  "events": [
    {
      "type": "fast_speech" | "laughter_spike" | "harsh_tone" | "sarcasm_likely" | "crowd_noise" | "urgent_tone" | "frustrated_tone",
      "confidence": 0.0-1.0,
      "note": "brief, supportive explanation in plain language"
    }
  ],
  "toneSummary": "brief description of overall tone"
}

IMPORTANT: 
- Never use alarming language
- Frame everything supportively
- If nothing concerning, return overallState: "calm" with empty events array
- Notes should be reassuring, e.g., "The teacher sounds busy, not mad at you"`,
        },
        {
          role: 'user',
          content: `Analyze this classroom audio transcript:\n\n"${transcript}"`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return getMockAnalysis(transcript);
    }

    const analysis = JSON.parse(content);
    const hasStressors = analysis.events && analysis.events.length > 0;
    
    return {
      detections: {
        overallState: analysis.overallState || (hasStressors ? 'stressor_detected' : 'calm'),
        events: (analysis.events || []).map((e: any, i: number) => ({
          t: i,
          type: e.type,
          confidence: e.confidence,
          note: e.note,
        })),
      },
      suggestedPrompt: hasStressors 
        ? CALMING_PROMPTS[Math.floor(Math.random() * CALMING_PROMPTS.length)]
        : '',
      uiState: hasStressors ? 'amber' : 'green',
      transcript,
    };
  } catch (error) {
    console.error('Analysis error:', error);
    return getMockAnalysis(transcript);
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
  // Use provided transcript or transcribe audio
  const transcript = providedTranscript || await transcribeAudio(audioPath);
  
  // Analyze the transcript
  return analyzeTranscript(transcript, sensitivity);
}

// Mock functions for demo/offline mode
function getMockTranscript(): string {
  const mockTranscripts = [
    "Alright everyone, let's settle down. Today we're going to learn about photosynthesis. Plants are amazing - they can make their own food from sunlight!",
    "Can everyone please pay attention? This is important. The test is next week and I need you all to focus. Let's go through this one more time.",
    "Great job on the assignment, class! I'm really proud of how hard everyone worked. Now let's move on to the next chapter.",
    "Okay okay, quiet down everyone! I know you're excited but we need to get through this material. Stop talking and listen please!",
  ];
  return mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
}

function getMockAnalysis(transcript: string): AnalysisResult {
  // Simple heuristic-based mock analysis
  const lowerTranscript = transcript.toLowerCase();
  const events: DetectionEvent[] = [];
  
  // Check for urgent/frustrated indicators
  if (lowerTranscript.includes('quiet down') || lowerTranscript.includes('pay attention') || lowerTranscript.includes('stop talking')) {
    events.push({
      t: 0,
      type: 'urgent_tone',
      confidence: 0.7,
      note: "The teacher is asking for attention. This is normal - it's not about you specifically.",
    });
  }
  
  if (lowerTranscript.includes('!') && (lowerTranscript.includes('please') || lowerTranscript.includes('now'))) {
    events.push({
      t: 1,
      type: 'frustrated_tone',
      confidence: 0.5,
      note: "The teacher sounds a bit stressed. Remember, teachers have busy days too.",
    });
  }

  const hasStressors = events.length > 0;
  
  return {
    detections: {
      overallState: hasStressors ? 'stressor_detected' : 'calm',
      events,
    },
    suggestedPrompt: hasStressors 
      ? CALMING_PROMPTS[Math.floor(Math.random() * CALMING_PROMPTS.length)]
      : '',
    uiState: hasStressors ? 'amber' : 'green',
    transcript,
  };
}

export default {
  transcribeAudio,
  analyzeTranscript,
  analyzeAudio,
};
