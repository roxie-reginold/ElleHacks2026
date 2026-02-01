/**
 * ElevenLabs Realtime WebSocket Service
 * 
 * Provides real-time speech-to-text with ~150ms latency using
 * ElevenLabs Scribe v2 Realtime WebSocket API.
 * 
 * Documentation Reference:
 * - Scribe v2 Realtime: https://elevenlabs.io/docs/cookbooks/speech-to-text/streaming
 * - ~150ms latency
 * - Real-time transcription
 * - WebSocket-based streaming
 * - Word-level timestamps
 * 
 * Authentication:
 * - Requires single-use token from: POST https://api.elevenlabs.io/v1/single-use-token/realtime_scribe
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface RealtimeTranscript {
  text: string;
  isFinal: boolean;
  words?: WordTimestamp[];
  confidence?: number;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface AudioEvent {
  type: string;  // 'laughter', 'applause', 'music', 'silence', etc.
  timestamp: number;
  confidence: number;
}

export interface SpeakerChange {
  speakerId: number;
  timestamp: number;
}

export interface RealtimeConfig {
  apiKey: string;
  languageCode?: string;
  sampleRate?: number;
  audioFormat?: 'pcm_8000' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100' | 'pcm_48000';
  commitStrategy?: 'manual' | 'vad';
  includeTimestamps?: boolean;
}

type RealtimeEventMap = {
  'connected': [];
  'disconnected': [reason: string];
  'error': [error: Error];
  'transcript': [data: RealtimeTranscript];
  'audioEvent': [event: AudioEvent];
  'speakerChange': [change: SpeakerChange];
};

// ============================================================================
// ElevenLabs Realtime Client
// ============================================================================

export class ElevenLabsRealtimeClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: RealtimeConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private accumulatedTranscript: string = '';
  private detectedEvents: string[] = [];
  private shouldReconnect: boolean = true; // H3 FIX: Control reconnection behavior
  private totalReconnects: number = 0; // H3 FIX: Track total reconnects to prevent infinite loops

  // WebSocket URL for ElevenLabs Scribe v2 Realtime
  // Ref: https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime
  private readonly WS_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';

  constructor(config: RealtimeConfig) {
    super();
    this.config = {
      languageCode: 'en',
      sampleRate: 16000,
      audioFormat: 'pcm_16000',
      commitStrategy: 'vad',
      includeTimestamps: false,
      ...config,
    };
  }

  /**
   * Connect to ElevenLabs Realtime WebSocket
   * Ref: https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime
   * 
   * Authentication options:
   * - Server-side: Use xi-api-key header
   * - Client-side: Use token query parameter (from /v1/tokens/create)
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Already connected to ElevenLabs Realtime');
      return;
    }

    try {
      console.log('🔌 Connecting to ElevenLabs Scribe v2 Realtime...');

      return new Promise((resolve, reject) => {
        try {
          // Build WebSocket URL with query params
          // Ref: https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime
          const url = new URL(this.WS_URL);
          
          // Required: model_id
          url.searchParams.set('model_id', 'scribe_v2_realtime');
          
          // Optional parameters per documentation
          if (this.config.languageCode) {
            url.searchParams.set('language_code', this.config.languageCode);
          }
          if (this.config.audioFormat) {
            url.searchParams.set('audio_format', this.config.audioFormat);
          }
          if (this.config.commitStrategy) {
            url.searchParams.set('commit_strategy', this.config.commitStrategy);
          }
          if (this.config.includeTimestamps) {
            url.searchParams.set('include_timestamps', 'true');
          }

          // Connect to WebSocket with API key in header (server-side auth)
          this.ws = new WebSocket(url.toString(), {
            headers: {
              'xi-api-key': this.config.apiKey,
            },
          });

          this.ws.on('open', () => {
            console.log('🔌 Connected to ElevenLabs Realtime WebSocket');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('connected');
            resolve();
          });

          this.ws.on('message', (data: WebSocket.Data) => {
            this.handleMessage(data);
          });

          this.ws.on('close', (code: number, reason: Buffer) => {
            console.log(`🔌 ElevenLabs Realtime disconnected: ${code} - ${reason.toString()}`);
            this.isConnected = false;
            this.emit('disconnected', reason.toString());
            
            // H3 FIX: Only reconnect if allowed and under total limit
            // Don't reconnect if intentionally disconnected (shouldReconnect=false)
            // Also limit total reconnects across all attempts to prevent infinite loops
            const maxTotalReconnects = 10;
            if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts && this.totalReconnects < maxTotalReconnects) {
              this.reconnectAttempts++;
              this.totalReconnects++;
              console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} (total: ${this.totalReconnects})...`);
              setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
            } else if (this.totalReconnects >= maxTotalReconnects) {
              console.log(`Max total reconnections (${maxTotalReconnects}) reached, stopping reconnection attempts`);
            }
          });

          this.ws.on('error', (error: Error) => {
            console.error('ElevenLabs Realtime WebSocket error:', error);
            this.emit('error', error);
            reject(error);
          });

        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('Failed to connect to ElevenLabs Realtime:', error);
      throw error;
    }
  }

  /**
   * Disconnect from ElevenLabs Realtime WebSocket
   */
  disconnect(): void {
    // H3 FIX: Prevent reconnection when intentionally disconnecting
    this.shouldReconnect = false;
    
    if (this.ws) {
      // Send end-of-stream signal
      this.sendEndOfStream();
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.accumulatedTranscript = '';
    this.detectedEvents = [];
  }

  /**
   * Send audio data to ElevenLabs for real-time transcription
   * @param audioData - Raw PCM audio data (16-bit signed, mono)
   * 
   * Ref: https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime
   * Message format: { message_type: "input_audio_chunk", audio_base_64: string, sample_rate: number }
   */
  sendAudio(audioData: Buffer | ArrayBuffer): void {
    if (!this.isConnected || !this.ws) {
      console.warn('Cannot send audio: not connected');
      return;
    }

    try {
      // Convert to Buffer if ArrayBuffer
      const buffer = audioData instanceof ArrayBuffer 
        ? Buffer.from(audioData) 
        : audioData;
      
      // Encode audio as base64 and send as input_audio_chunk message
      // Ref: https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime
      // FIX: Must include message_type: "input_audio_chunk" - this was missing!
      const message = {
        message_type: 'input_audio_chunk',
        audio_base_64: buffer.toString('base64'),
        sample_rate: this.config.sampleRate || 16000,
      };
      
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending audio:', error);
      this.emit('error', error as Error);
    }
  }

  /**
   * Commit the current transcript segment (for manual commit strategy)
   * Ref: https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime
   */
  commit(): void {
    if (!this.isConnected || !this.ws) return;

    try {
      // ElevenLabs uses message_type, not type
      this.ws.send(JSON.stringify({ message_type: 'commit' }));
    } catch (error) {
      console.error('Error sending commit:', error);
    }
  }

  /**
   * Signal end of audio stream
   */
  sendEndOfStream(): void {
    if (!this.isConnected || !this.ws) return;

    try {
      // Commit any pending transcript before closing
      this.commit();
    } catch (error) {
      console.error('Error sending EOS:', error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   * 
   * Event types from ElevenLabs:
   * - session_started: Connection confirmed
   * - partial_transcript: Live transcript update
   * - committed_transcript: Finalized transcript segment
   * - committed_transcript_with_timestamps: With word timestamps
   * - error events: auth_error, quota_exceeded, etc.
   * 
   * Ref: https://elevenlabs.io/docs/cookbooks/speech-to-text/streaming#event-reference
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      
      // ElevenLabs uses 'message_type' not 'type'
      // Evidence: debug log showed keys: ["message_type","session_id","config"]
      const messageType = message.message_type || message.type || message.event || message.kind;
      
      // Handle different message types from ElevenLabs Realtime API
      switch (messageType) {
        case 'session_started':
        case 'session.started':
          console.log('📡 ElevenLabs session started:', message.session_id || message.sessionId);
          break;
          
        case 'partial_transcript':
          // Live transcript update (not final)
          this.handleTranscript({
            text: message.text || '',
            isFinal: false,
          });
          break;
          
        case 'committed_transcript':
          // Finalized transcript segment
          this.handleTranscript({
            text: message.text || '',
            isFinal: true,
          });
          break;
          
        case 'committed_transcript_with_timestamps':
          // Finalized with word timestamps
          this.handleTranscript({
            text: message.text || '',
            isFinal: true,
            words: message.words,
          });
          break;
          
        // Error events
        case 'auth_error':
        case 'quota_exceeded':
        case 'transcriber_error':
        case 'input_error':
        case 'error':
        case 'commit_throttled':
        case 'rate_limited':
        case 'queue_overflow':
        case 'resource_exhausted':
        case 'session_time_limit_exceeded':
        case 'chunk_size_exceeded':
        case 'insufficient_audio_activity':
          console.error('ElevenLabs error:', messageType, message.message || message.error);
          this.emit('error', new Error(`${messageType}: ${message.message || message.error || 'Unknown error'}`));
          break;
          
        case undefined:
        case null:
          // H4 FIX: Handle messages without type (like acks, keep-alives, or different structures)
          // Check if it might be a transcript or other useful data
          if (message.text !== undefined) {
            this.handleTranscript({
              text: message.text,
              isFinal: message.is_final || message.isFinal || message.final || false,
            });
          } else if (message.transcript !== undefined) {
            this.handleTranscript({
              text: message.transcript,
              isFinal: message.is_final || message.isFinal || message.final || false,
            });
          }
          // Don't log as unknown for expected no-type messages
          break;
          
        default:
          // Handle generic transcript format for backward compatibility
          if (message.text !== undefined) {
            this.handleTranscript({
              text: message.text,
              isFinal: message.is_final || message.isFinal || false,
            });
          } else {
            console.debug('Unknown message type:', messageType, 'keys:', Object.keys(message));
          }
      }
    } catch (error) {
      // Handle binary or non-JSON messages
      console.debug('Non-JSON message received');
    }
  }

  /**
   * Handle transcript messages
   */
  private handleTranscript(message: any): void {
    const transcript: RealtimeTranscript = {
      text: message.text || message.transcript || '',
      isFinal: message.is_final || message.isFinal || message.type === 'final_transcript',
      words: message.words?.map((w: any) => ({
        word: w.word || w.text,
        start: w.start || w.start_time || 0,
        end: w.end || w.end_time || 0,
        confidence: w.confidence || 1.0,
      })),
      confidence: message.confidence,
    };

    // Check for inline audio tags like [Laughter]
    const audioTagRegex = /\[(Laughter|Applause|Music|Silence|Coughing|Background_Noise)\]/gi;
    const matches = transcript.text.match(audioTagRegex);
    if (matches) {
      for (const match of matches) {
        const eventType = match.replace(/[\[\]]/g, '').toLowerCase();
        if (!this.detectedEvents.includes(eventType)) {
          this.detectedEvents.push(eventType);
          this.emit('audioEvent', {
            type: eventType,
            timestamp: Date.now(),
            confidence: 0.8,
          } as AudioEvent);
        }
      }
    }

    // Update accumulated transcript
    if (transcript.isFinal) {
      this.accumulatedTranscript += ' ' + transcript.text;
      this.accumulatedTranscript = this.accumulatedTranscript.trim();
    }

    this.emit('transcript', transcript);
  }

  /**
   * Handle audio event messages (laughter, applause, etc.)
   */
  private handleAudioEvent(message: any): void {
    const event: AudioEvent = {
      type: message.type || message.event_type || message.event || 'unknown',
      timestamp: message.timestamp || Date.now(),
      confidence: message.confidence || 0.8,
    };

    // Track detected events
    const eventKey = event.type.toLowerCase();
    if (!this.detectedEvents.includes(eventKey)) {
      this.detectedEvents.push(eventKey);
    }

    this.emit('audioEvent', event);
  }

  /**
   * Handle speaker change messages
   */
  private handleSpeakerChange(message: any): void {
    const change: SpeakerChange = {
      speakerId: message.speaker_id || message.speakerId || 0,
      timestamp: message.timestamp || Date.now(),
    };

    this.emit('speakerChange', change);
  }

  /**
   * Get accumulated transcript so far
   */
  getAccumulatedTranscript(): string {
    return this.accumulatedTranscript;
  }

  /**
   * Get all detected audio events
   */
  getDetectedEvents(): string[] {
    return [...this.detectedEvents];
  }

  /**
   * Clear accumulated data (call when starting new session)
   */
  clearAccumulated(): void {
    this.accumulatedTranscript = '';
    this.detectedEvents = [];
  }

  /**
   * Check if connected
   */
  isActive(): boolean {
    return this.isConnected;
  }

  // Type-safe event emitter methods
  override on<K extends keyof RealtimeEventMap>(
    event: K,
    listener: (...args: RealtimeEventMap[K]) => void
  ): this {
    return super.on(event, listener as (...args: any[]) => void);
  }

  override emit<K extends keyof RealtimeEventMap>(
    event: K,
    ...args: RealtimeEventMap[K]
  ): boolean {
    return super.emit(event, ...args);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new ElevenLabs Realtime client
 */
export function createRealtimeClient(config?: Partial<RealtimeConfig>): ElevenLabsRealtimeClient | null {
  const apiKey = config?.apiKey || process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.warn('No ElevenLabs API key available for realtime service');
    return null;
  }

  return new ElevenLabsRealtimeClient({
    apiKey,
    ...config,
  });
}

export default {
  ElevenLabsRealtimeClient,
  createRealtimeClient,
};
