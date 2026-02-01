import { GoogleGenerativeAI } from '@google/generative-ai';
import { EventEmitter } from 'events';

/**
 * Gemini Live WebSocket Client for Real-time Audio Analysis
 * 
 * Streams audio to Gemini 2.0 Flash and receives:
 * - Real-time transcription
 * - Social context analysis (tone, sentiment, stressors)
 * - Audio event detection
 */

export interface GeminiTranscript {
    text: string;
    isFinal: boolean;
    timestamp: number;
}

export interface GeminiAnalysis {
    assessment: 'friendly' | 'neutral' | 'tense' | 'unknown';
    summary: string;
    triggers: string[];
    confidence: number;
    recommendations: string[];
    tone?: string;
}

export interface GeminiAudioEvent {
    type: string;
    confidence: number;
    timestamp: number;
}

export class GeminiLiveClient extends EventEmitter {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private session: any;
    private isConnected: boolean = false;
    private accumulatedTranscript: string = '';
    private detectedEvents: string[] = [];
    private apiKey: string;
    private audioBuffer: Buffer[] = [];
    private processingTimer: NodeJS.Timeout | null = null;
    private readonly BATCH_INTERVAL_MS = 2000; // Process audio every 2 seconds

    constructor(apiKey: string) {
        super();
        if (!apiKey) {
            throw new Error('Gemini API key is required');
        }
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Connect to Gemini Live API and start a new session
     */
    async connect(): Promise<void> {
        try {
            console.log('🔌 Connecting to Gemini Live API...');

            // Use Gemini 2.0 Flash Experimental with multimodal capabilities
            this.model = this.genAI.getGenerativeModel({
                model: 'gemini-2.0-flash-exp',
            });

            // Start a live chat session with audio input
            this.session = await this.model.startChat({
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 2048,
                },
                systemInstruction: `You are an emotional support assistant for neurodivergent students in classroom environments.

Your role is to:
1. Transcribe what you hear in real-time
2. Analyze the social and emotional context of conversations
3. Detect potential stressors (fast speech, harsh tone, sarcasm, sudden volume changes)
4. Provide supportive, non-judgmental assessments

For each audio segment, respond in this JSON format:
{
  "transcript": "what was said",
  "assessment": "friendly|neutral|tense|unknown",
  "tone": "calm|urgent|frustrated|excited",
  "triggers": ["list of potential stressors detected"],
  "summary": "brief, supportive summary of what's happening",
  "confidence": 0.0-1.0,
  "recommendations": ["supportive actions or coping strategies"]
}

Guidelines:
- Be supportive and non-judgmental
- Detect social cues that might be confusing for neurodivergent students
- Flag fast speech, loud voices, sarcasm, or ambiguous phrases
- Keep summaries short and kind
- Never use clinical language or diagnose
`,
            });

            this.isConnected = true;
            this.accumulatedTranscript = '';
            this.detectedEvents = [];

            // Start periodic audio processing
            this.startAudioProcessing();

            this.emit('connected');
            console.log('✅ Connected to Gemini Live API');

        } catch (error: any) {
            console.error('❌ Failed to connect to Gemini Live API:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Start periodic audio processing
     */
    private startAudioProcessing(): void {
        this.processingTimer = setInterval(async () => {
            if (this.audioBuffer.length > 0) {
                await this.processBufferedAudio();
            }
        }, this.BATCH_INTERVAL_MS);
    }

    /**
     * Stop periodic audio processing
     */
    private stopAudioProcessing(): void {
        if (this.processingTimer) {
            clearInterval(this.processingTimer);
            this.processingTimer = null;
        }
        this.audioBuffer = []; // Clear any remaining buffered audio
    }

    /**
     * Send audio data to buffer (will be processed in batches)
     * @param audioBuffer PCM audio data (16-bit, 16kHz, mono)
     */
    async sendAudio(audioBuffer: Buffer): Promise<void> {
        if (!this.isConnected || !this.session) {
            return;
        }

        // Add to buffer for batch processing
        this.audioBuffer.push(audioBuffer);
    }

    /**
     * Process buffered audio chunks
     */
    private async processBufferedAudio(): Promise<void> {
        if (this.audioBuffer.length === 0) return;

        try {
            // Combine all buffered audio chunks
            const combinedBuffer = Buffer.concat(this.audioBuffer);
            this.audioBuffer = []; // Clear buffer

            // Convert Buffer to base64 for Gemini
            const base64Audio = combinedBuffer.toString('base64');

            console.log(`📤 Sending ${combinedBuffer.length} bytes of audio to Gemini`);

            // Send audio with inline data
            const result = await this.session.sendMessage([
                {
                    inlineData: {
                        mimeType: 'audio/pcm',
                        data: base64Audio,
                    },
                },
            ]);

            // Process the response
            await this.processResponse(result);

        } catch (error: any) {
            console.error('Error processing buffered audio:', error);
            this.emit('error', error);
        }
    }

    /**
     * Process response from Gemini
     */
    private async processResponse(result: any): Promise<void> {
        try {
            const response = await result.response;
            const text = response.text();

            // Try to parse as JSON
            let analysisData: any;
            try {
                analysisData = JSON.parse(text);
            } catch {
                // If not JSON, treat as plain transcript
                analysisData = {
                    transcript: text,
                    assessment: 'neutral',
                    tone: 'unknown',
                    triggers: [],
                    summary: text,
                    confidence: 0.5,
                    recommendations: [],
                };
            }

            // Emit transcript
            if (analysisData.transcript) {
                this.accumulatedTranscript += ' ' + analysisData.transcript;

                this.emit('transcript', {
                    text: analysisData.transcript,
                    isFinal: true,
                    timestamp: Date.now(),
                } as GeminiTranscript);
            }

            // Emit analysis
            const analysis: GeminiAnalysis = {
                assessment: analysisData.assessment || 'neutral',
                summary: analysisData.summary || '',
                triggers: analysisData.triggers || [],
                confidence: analysisData.confidence || 0.5,
                recommendations: analysisData.recommendations || [],
                tone: analysisData.tone,
            };

            this.emit('analysis', analysis);

            // Emit audio events based on triggers
            if (analysisData.triggers && analysisData.triggers.length > 0) {
                for (const trigger of analysisData.triggers) {
                    this.detectedEvents.push(trigger);
                    this.emit('audioEvent', {
                        type: trigger,
                        confidence: analysisData.confidence || 0.7,
                        timestamp: Date.now(),
                    } as GeminiAudioEvent);
                }
            }

        } catch (error: any) {
            console.error('Error processing Gemini response:', error);
            this.emit('error', error);
        }
    }

    /**
     * Send text message to continue the conversation
     */
    async sendMessage(message: string): Promise<string> {
        if (!this.isConnected || !this.session) {
            throw new Error('Not connected to Gemini Live API');
        }

        try {
            const result = await this.session.sendMessage(message);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            console.error('Error sending message to Gemini:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Disconnect from Gemini Live API
     */
    disconnect(): void {
        // Stop audio processing timer
        this.stopAudioProcessing();

        if (this.session) {
            // Gemini SDK doesn't have explicit disconnect, just clear the session
            this.session = null;
        }

        this.isConnected = false;
        this.emit('disconnected', 'Client disconnected');
        console.log('🔌 Disconnected from Gemini Live API');
    }

    /**
     * Check if client is connected and active
     */
    isActive(): boolean {
        return this.isConnected && this.session != null;
    }

    /**
     * Get accumulated transcript from the session
     */
    getAccumulatedTranscript(): string {
        return this.accumulatedTranscript.trim();
    }

    /**
     * Get detected audio events
     */
    getDetectedEvents(): string[] {
        return [...this.detectedEvents];
    }

    /**
     * Clear accumulated data
     */
    clearAccumulated(): void {
        this.accumulatedTranscript = '';
        this.detectedEvents = [];
    }
}

/**
 * Factory function to create a Gemini Live client
 */
export function createGeminiLiveClient(): GeminiLiveClient | null {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY not found in environment variables');
        return null;
    }

    try {
        return new GeminiLiveClient(apiKey);
    } catch (error) {
        console.error('❌ Failed to create Gemini Live client:', error);
        return null;
    }
}
