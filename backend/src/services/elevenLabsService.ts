import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import fs from 'fs';
import path from 'path';

// Initialize ElevenLabs client (will be null if no API key)
const elevenlabs = process.env.ELEVENLABS_API_KEY
  ? new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  : null;

/**
 * ElevenLabs Model IDs (as per official documentation)
 * Reference: https://elevenlabs.io/docs/overview/intro
 */
export const ELEVENLABS_MODELS = {
  /** Ultra-low latency (~75ms), 32 languages, 40,000 char limit, 50% cheaper */
  FLASH_V2_5: 'eleven_flash_v2_5',
  /** High quality, low latency (~250ms-300ms), 32 languages, 40,000 char limit, 50% cheaper */
  TURBO_V2_5: 'eleven_turbo_v2_5',
  /** Natural-sounding, 29 languages, 10,000 char limit, most stable on long-form */
  MULTILINGUAL_V2: 'eleven_multilingual_v2',
  /** Most emotionally rich and expressive, 70+ languages, 5,000 char limit (Alpha) */
  V3: 'eleven_v3',
} as const;

export interface TextToSpeechOptions {
  voiceId?: string;
  modelId?: string;
  outputFormat?: 'mp3_44100_128' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100';
  stability?: number; // 0-1 (higher = more stable/consistent)
  similarityBoost?: number; // 0-1 (higher = more similar to original voice)
}

export interface SpeechResult {
  success: boolean;
  audioPath?: string;
  characterCount?: number;
  requestId?: string;
  error?: string;
}

/**
 * Convert text to speech using ElevenLabs API
 * Reference: https://elevenlabs.io/docs/api-reference/text-to-speech
 * 
 * Model Selection Guide:
 * - FLASH_V2_5: Ultra-low latency (~75ms), best for real-time responses
 * - TURBO_V2_5: Balanced quality/speed (~250-300ms), default, 50% cheaper
 * - MULTILINGUAL_V2: Natural-sounding, most stable for long-form content
 * - V3 (Alpha): Most emotionally expressive, dramatic delivery
 * 
 * @param text - The text to convert to speech (up to 40,000 chars for Turbo/Flash)
 * @param options - Configuration options for voice and quality
 * @param outputPath - Optional path to save the audio file (default: temp directory)
 * @returns SpeechResult with path to audio file
 */
export async function textToSpeech(
  text: string,
  options: TextToSpeechOptions = {},
  outputPath?: string
): Promise<SpeechResult> {
  if (!elevenlabs) {
    console.log('No ElevenLabs API key, text-to-speech unavailable');
    return {
      success: false,
      error: 'ElevenLabs API key not configured',
    };
  }

  const {
    voiceId = 'EXAVITQu4vr4xnSDxMaL', // Default voice (Sarah)
    modelId = ELEVENLABS_MODELS.TURBO_V2_5, // Balanced quality/speed, 50% cheaper
    outputFormat = 'mp3_44100_128',
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  try {
    // Get raw response with headers to track costs
    const { data, rawResponse } = await elevenlabs.textToSpeech
      .convert(voiceId, {
        text,
        modelId: modelId,
        outputFormat: outputFormat,
        voiceSettings: {
          stability,
          similarityBoost: similarityBoost,
        },
      })
      .withRawResponse();

    // Access character cost and request ID from headers
    // Per ElevenLabs API: 'character-cost' is the correct header (not 'x-character-count')
    const characterCount = rawResponse.headers.get('character-cost');
    const requestId = rawResponse.headers.get('request-id');

    // Determine output path (save to backend/audio directory in repo)
    const audioDir = path.join(__dirname, '../../audio');
    
    // Ensure audio directory exists
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    
    const finalOutputPath = outputPath || path.join(
      audioDir,
      `elevenlabs_${Date.now()}.mp3`
    );

    // Convert ReadableStream to Buffer and save
    const chunks: Uint8Array[] = [];
    for await (const chunk of data as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(finalOutputPath, buffer);

    console.log(`Text-to-speech completed: ${characterCount} characters used`);

    return {
      success: true,
      audioPath: finalOutputPath,
      characterCount: characterCount ? parseInt(characterCount) : undefined,
      requestId: requestId || undefined,
    };
  } catch (error: any) {
    console.error('ElevenLabs text-to-speech error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

/**
 * Get list of available voices from ElevenLabs
 * @returns Array of available voices
 */
export async function getVoices() {
  if (!elevenlabs) {
    console.log('No ElevenLabs API key, cannot fetch voices');
    return null;
  }

  try {
    const voices = await elevenlabs.voices.getAll();
    return voices;
  } catch (error) {
    console.error('Error fetching voices:', error);
    return null;
  }
}

/**
 * Stream text to speech (useful for real-time playback)
 * @param text - The text to convert to speech
 * @param options - Configuration options
 * @returns ReadableStream of audio data
 */
export async function streamTextToSpeech(
  text: string,
  options: TextToSpeechOptions = {}
) {
  if (!elevenlabs) {
    throw new Error('ElevenLabs API key not configured');
  }

  const {
    voiceId = 'EXAVITQu4vr4xnSDxMaL',
    modelId = ELEVENLABS_MODELS.TURBO_V2_5, // Balanced quality/speed
    outputFormat = 'mp3_44100_128',
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  try {
    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text,
      modelId: modelId,
      outputFormat: outputFormat,
      voiceSettings: {
        stability,
        similarityBoost: similarityBoost,
      },
    });

    return audioStream;
  } catch (error) {
    console.error('ElevenLabs streaming error:', error);
    throw error;
  }
}

/**
 * Helper function to generate calming audio prompts
 * Optimized for Whisper Lite's real-time stress detection features
 * Uses FLASH_V2_5 model for ultra-low latency (~75ms) and 50% cost savings
 * 
 * @param prompt - The calming text to convert to speech
 * @param outputPath - Optional path to save the audio file
 * @returns SpeechResult with audio file path and metadata
 */
export async function generateCalmingPrompt(
  prompt: string,
  outputPath?: string
): Promise<SpeechResult> {
  // Use FLASH_V2_5 for ultra-low latency in stress detection scenarios
  // Higher stability = more consistent, calming delivery
  return textToSpeech(
    prompt,
    {
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - gentle, calming voice
      modelId: ELEVENLABS_MODELS.FLASH_V2_5, // Ultra-fast, 50% cheaper
      stability: 0.7, // Higher stability for calming, consistent delivery
      similarityBoost: 0.6, // Balanced clarity
    },
    outputPath
  );
}

export default {
  textToSpeech,
  getVoices,
  streamTextToSpeech,
  generateCalmingPrompt,
  MODELS: ELEVENLABS_MODELS,
};
