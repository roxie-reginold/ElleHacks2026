/**
 * ElevenLabs Audio Processing Service
 * 
 * Provides Voice Isolator and Scribe v2 functionality for real-time
 * classroom audio analysis in the Context Clues feature.
 * 
 * Documentation References:
 * - Voice Isolator: https://elevenlabs.io/docs/overview/capabilities/voice-isolator
 * - Speech-to-Text (Scribe v2): https://elevenlabs.io/docs/overview/capabilities/speech-to-text
 * - API Reference: https://elevenlabs.io/docs/api-reference/introduction
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import fs from 'fs';
import path from 'path';

// Initialize ElevenLabs client
const elevenlabs = process.env.ELEVENLABS_API_KEY
  ? new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  : null;

// ============================================================================
// Types
// ============================================================================

export interface Speaker {
  id: number;
  label: string;
  segments: SpeakerSegment[];
}

export interface SpeakerSegment {
  start: number;
  end: number;
  text: string;
}

export interface AudioEvent {
  type: string;  // 'Laughter', 'Applause', 'Music', 'Silence', etc.
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptionResult {
  success: boolean;
  transcript: string;
  audioEvents: string[];      // ['Laughter', 'Multiple_Voices']
  speakers: Speaker[];        // Diarization data (up to 32 speakers)
  words: WordTimestamp[];     // Word-level timestamps
  language: string;
  error?: string;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface VoiceIsolationResult {
  success: boolean;
  audioBuffer?: Buffer;
  audioPath?: string;
  error?: string;
}

// ============================================================================
// Voice Isolator
// Ref: https://elevenlabs.io/docs/api-reference/audio-isolation/stream
// ============================================================================

/**
 * Isolate voices from background noise in classroom audio.
 * Removes AC hum, chair scraping, ambient chatter, etc.
 * 
 * NOTE: Voice isolation requires valid audio input (not raw PCM).
 * For real-time streaming, we skip isolation and use the Realtime API directly.
 * 
 * @param audioBuffer - Raw audio buffer (must be valid audio format like WAV/MP3)
 * @returns Clean audio with isolated voices
 */
export async function isolateVoice(
  audioBuffer: Buffer
): Promise<VoiceIsolationResult> {
  if (!elevenlabs) {
    console.log('No ElevenLabs API key, voice isolation unavailable');
    return {
      success: false,
      error: 'ElevenLabs API key not configured',
    };
  }

  // Validate that the buffer is not empty and has reasonable size
  if (!audioBuffer || audioBuffer.length < 100) {
    console.log('Audio buffer too small or empty, skipping isolation');
    return {
      success: true,
      audioBuffer: audioBuffer,
      error: 'Audio buffer too small',
    };
  }

  try {
    // Create a temporary file for the audio input
    const tempInputPath = path.join('/tmp', `voice_input_${Date.now()}.wav`);
    fs.writeFileSync(tempInputPath, audioBuffer);

    // Call ElevenLabs Voice Isolator API using the stream method
    // Ref: https://elevenlabs.io/docs/api-reference/audio-isolation/stream
    // SDK method: client.audioIsolation.stream({ audio: file })
    const isolatedAudio = await elevenlabs.audioIsolation.stream({
      audio: fs.createReadStream(tempInputPath),
    });

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of isolatedAudio as any) {
      chunks.push(chunk);
    }
    const isolatedBuffer = Buffer.concat(chunks);

    // Save isolated audio
    const audioDir = path.join(__dirname, '../../audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    const outputPath = path.join(audioDir, `isolated_${Date.now()}.mp3`);
    fs.writeFileSync(outputPath, isolatedBuffer);

    // Clean up temp file
    fs.unlinkSync(tempInputPath);

    console.log('Voice isolation completed successfully');

    return {
      success: true,
      audioBuffer: isolatedBuffer,
      audioPath: outputPath,
    };
  } catch (error: any) {
    console.error('Voice isolation error:', error);
    // Clean up temp file if it exists
    try {
      const tempInputPath = path.join('/tmp', `voice_input_${Date.now()}.wav`);
      if (fs.existsSync(tempInputPath)) {
        fs.unlinkSync(tempInputPath);
      }
    } catch { }

    // Return original audio if isolation fails (graceful degradation)
    return {
      success: true,
      audioBuffer: audioBuffer,
      error: error.message || 'Voice isolation failed, using original audio',
    };
  }
}

// ============================================================================
// Scribe v2 - Speech-to-Text with Audio Tagging
// Ref: https://elevenlabs.io/docs/overview/capabilities/speech-to-text
// ============================================================================

/**
 * Transcribe audio and detect audio events using Scribe v2.
 * 
 * Features (from docs):
 * - 90+ language support
 * - Dynamic Audio Tagging: [Laughter], [Applause], [Music], [Silence]
 * - Speaker Diarization: Up to 32 speakers
 * - Word-level timestamps
 * - ~150ms latency (Realtime mode)
 * 
 * @param audioBuffer - Audio buffer (preferably isolated)
 * @param options - Transcription options
 * @returns Transcript with audio events and speaker diarization
 */
export async function transcribeWithTags(
  audioBuffer: Buffer,
  options: {
    language?: string;
    numSpeakers?: number;  // Expected number of speakers (up to 32)
    tagAudioEvents?: boolean;
  } = {}
): Promise<TranscriptionResult> {
  if (!elevenlabs) {
    console.log('No ElevenLabs API key, transcription unavailable');
    return {
      success: false,
      transcript: '',
      audioEvents: [],
      speakers: [],
      words: [],
      language: 'en',
      error: 'ElevenLabs API key not configured',
    };
  }

  const {
    language = 'en',
    numSpeakers = 2,  // Default: teacher + students
    tagAudioEvents = true,
  } = options;

  // Validate that the buffer is not empty and has reasonable size
  if (!audioBuffer || audioBuffer.length < 100) {
    console.log('Audio buffer too small or empty for transcription');
    return {
      success: false,
      transcript: '',
      audioEvents: [],
      speakers: [],
      words: [],
      language: 'en',
      error: 'Audio buffer too small for transcription',
    };
  }

  try {
    // Create temporary file for audio input
    const tempPath = path.join('/tmp', `scribe_input_${Date.now()}.wav`);
    fs.writeFileSync(tempPath, audioBuffer);

    // Call ElevenLabs Scribe v2 API
    // Ref: https://elevenlabs.io/docs/api-reference/speech-to-text/convert
    // SDK uses camelCase parameter names
    const transcription = await elevenlabs.speechToText.convert({
      file: fs.createReadStream(tempPath),
      modelId: 'scribe_v2',  // Use Scribe v2 model
      languageCode: language,
      tagAudioEvents: tagAudioEvents,
      diarize: true,
      numSpeakers: numSpeakers,
      timestampsGranularity: 'word',
    });

    // Clean up temp file
    fs.unlinkSync(tempPath);

    // Parse response
    // Note: Response structure based on ElevenLabs API reference
    const result = transcription as any;

    // Extract audio events from transcription
    const audioEvents = extractAudioEvents(result);

    // Extract speaker diarization
    const speakers = extractSpeakers(result);

    // Extract word timestamps
    const words = extractWords(result);

    console.log(`Transcription completed: ${audioEvents.length} events detected, ${speakers.length} speakers`);
    console.log(`📝 Transcript text: "${result.text || ''}"`);
    console.log(`   Audio events: ${audioEvents.join(', ') || 'none'}`);

    return {
      success: true,
      transcript: result.text || '',
      audioEvents,
      speakers,
      words,
      language: result.language_code || language,
    };
  } catch (error: any) {
    console.error('Transcription error:', error);
    return {
      success: false,
      transcript: '',
      audioEvents: [],
      speakers: [],
      words: [],
      language: 'en',
      error: error.message || 'Transcription failed',
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract audio events from Scribe v2 response.
 * Events include: [Laughter], [Applause], [Music], [Silence], [Background_Noise]
 */
function extractAudioEvents(result: any): string[] {
  const events: string[] = [];

  // Check for audio_events field in response
  if (result.audio_events && Array.isArray(result.audio_events)) {
    for (const event of result.audio_events) {
      if (event.type) {
        events.push(event.type);
      }
    }
  }

  // Also check for inline tags in transcript [Laughter], [Applause], etc.
  const text = result.text || '';
  const tagRegex = /\[(Laughter|Applause|Music|Silence|Background_Noise|Coughing|Sneezing)\]/gi;
  const matches = text.match(tagRegex);
  if (matches) {
    for (const match of matches) {
      const tag = match.replace(/[\[\]]/g, '');
      if (!events.includes(tag)) {
        events.push(tag);
      }
    }
  }

  // Check for multiple voices indicator
  if (result.speakers && result.speakers.length > 2) {
    events.push('Multiple_Voices');
  }

  return events;
}

/**
 * Extract speaker diarization from Scribe v2 response.
 * Supports up to 32 speakers.
 */
function extractSpeakers(result: any): Speaker[] {
  const speakers: Speaker[] = [];

  if (result.speakers && Array.isArray(result.speakers)) {
    for (const speaker of result.speakers) {
      speakers.push({
        id: speaker.id || speakers.length,
        label: speaker.label || `Speaker_${speakers.length + 1}`,
        segments: (speaker.segments || []).map((seg: any) => ({
          start: seg.start || 0,
          end: seg.end || 0,
          text: seg.text || '',
        })),
      });
    }
  }

  // If no diarization data, create default speaker
  if (speakers.length === 0 && result.text) {
    speakers.push({
      id: 0,
      label: 'Speaker_1',
      segments: [{
        start: 0,
        end: 0,
        text: result.text,
      }],
    });
  }

  return speakers;
}

/**
 * Extract word-level timestamps from Scribe v2 response.
 */
function extractWords(result: any): WordTimestamp[] {
  const words: WordTimestamp[] = [];

  if (result.words && Array.isArray(result.words)) {
    for (const word of result.words) {
      words.push({
        word: word.word || word.text || '',
        start: word.start || 0,
        end: word.end || 0,
        confidence: word.confidence || 1.0,
      });
    }
  }

  return words;
}

// ============================================================================
// Combined Processing Pipeline
// ============================================================================

/**
 * Full audio processing pipeline for Context Clues:
 * 1. Voice Isolation (remove background noise)
 * 2. Scribe v2 Transcription (with audio tagging + diarization)
 * 
 * @param rawAudioBuffer - Raw audio from Web Audio API
 * @param options - Processing options
 * @returns Combined result with clean transcript and audio events
 */
export async function processContextAudio(
  rawAudioBuffer: Buffer,
  options: {
    skipIsolation?: boolean;
    language?: string;
    numSpeakers?: number;
  } = {}
): Promise<{
  success: boolean;
  transcript: string;
  audioEvents: string[];
  speakers: Speaker[];
  isolatedAudioPath?: string;
  error?: string;
}> {
  const { skipIsolation = false, language = 'en', numSpeakers = 2 } = options;

  try {
    let audioToTranscribe = rawAudioBuffer;
    let isolatedPath: string | undefined;

    // Step 1: Voice Isolation (optional but recommended)
    if (!skipIsolation) {
      console.log('Step 1: Isolating voice from background noise...');
      const isolationResult = await isolateVoice(rawAudioBuffer);

      if (isolationResult.success && isolationResult.audioBuffer) {
        audioToTranscribe = isolationResult.audioBuffer;
        isolatedPath = isolationResult.audioPath;
        console.log('Voice isolation successful');
      } else {
        console.log('Voice isolation failed, using raw audio');
      }
    }

    // Step 2: Transcribe with Scribe v2
    console.log('Step 2: Transcribing with Scribe v2...');
    const transcriptionResult = await transcribeWithTags(audioToTranscribe, {
      language,
      numSpeakers,
      tagAudioEvents: true,
    });

    if (!transcriptionResult.success) {
      return {
        success: false,
        transcript: '',
        audioEvents: [],
        speakers: [],
        error: transcriptionResult.error,
      };
    }

    return {
      success: true,
      transcript: transcriptionResult.transcript,
      audioEvents: transcriptionResult.audioEvents,
      speakers: transcriptionResult.speakers,
      isolatedAudioPath: isolatedPath,
    };
  } catch (error: any) {
    console.error('Context audio processing error:', error);
    return {
      success: false,
      transcript: '',
      audioEvents: [],
      speakers: [],
      error: error.message || 'Processing failed',
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  isolateVoice,
  transcribeWithTags,
  processContextAudio,
};
