import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Load environment variables from backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('🔑 ELEVENLABS_API_KEY loaded:', process.env.ELEVENLABS_API_KEY ? 'Yes (starts with ' + process.env.ELEVENLABS_API_KEY.substring(0, 4) + ')' : 'No');
console.log('📂 Loading .env from:', path.resolve(__dirname, '../.env'));

// Import routes
import analyzeRoutes from './routes/analyze';
import recapRoutes from './routes/recap';
import dashboardRoutes from './routes/dashboard';
import profileRoutes from './routes/profile';
import alertRoutes from './routes/alert';
import contextCluesRoutes from './routes/contextClues';
import emotionsRoutes from './routes/emotions';
import teacherRequestsRoutes from './routes/teacherrequests';
import affirmationsRoutes from './routes/affirmations';
import textToSpeechRoutes from './routes/textToSpeech';

// Import Context Clues services
import { processContextAudio } from './services/elevenLabsAudioService';
import { analyzeSocialContext, getQuickEventInterpretation } from './services/geminiSocialService';
import { generateCalmingPrompt } from './services/elevenLabsService';
import { ElevenLabsRealtimeClient, createRealtimeClient } from './services/elevenLabsRealtimeService';
import { GeminiLiveClient, createGeminiLiveClient } from './services/geminiLiveService';
import ContextEvent from './models/ContextEvent';
import { seedContextClues } from './models/ContextClue';

// Store active realtime clients per socket (supporting both ElevenLabs and Gemini)
const realtimeClients = new Map<string, ElevenLabsRealtimeClient | GeminiLiveClient>();

// Gemini analysis interval (batched every 5 seconds)
const GEMINI_ANALYSIS_INTERVAL = 5000;

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize Socket.io with CORS
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],  // Vite + Next.js
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/recap', recapRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/alert', alertRoutes);
app.use('/api/context-clues', contextCluesRoutes);
app.use('/api/emotions', emotionsRoutes);
app.use('/api/teacher-requests', teacherRequestsRoutes);
app.use('/api/affirmations', affirmationsRoutes);
app.use('/api/tts', textToSpeechRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    websocket: 'enabled',
  });
});

// ============================================================================
// WebSocket Event Handlers for Context Clues Real-time Analysis
// ============================================================================

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  let currentSessionId: string | null = null;
  let userId: string = 'demo-user';
  let realtimeClient: ElevenLabsRealtimeClient | GeminiLiveClient | null = null;
  let geminiAnalysisTimer: NodeJS.Timeout | null = null;
  let accumulatedEvents: string[] = [];
  let lastAnalysisTime = 0;

  // Handle user authentication/identification
  socket.on('auth', (data: { userId: string }) => {
    userId = data.userId || 'demo-user';
    console.log(`👤 User identified: ${userId}`);
  });

  // Start a new listening session
  socket.on('session:start', () => {
    currentSessionId = `session_${Date.now()}_${socket.id}`;
    console.log(`🎧 Listening session started: ${currentSessionId}`);
    socket.emit('session:started', { sessionId: currentSessionId });
  });

  // End the current listening session
  socket.on('session:end', () => {
    console.log(`🛑 Listening session ended: ${currentSessionId}`);
    currentSessionId = null;

    // Clean up realtime client
    if (realtimeClient) {
      realtimeClient.disconnect();
      realtimeClients.delete(socket.id);
      realtimeClient = null;
    }

    // Clear Gemini analysis timer
    if (geminiAnalysisTimer) {
      clearInterval(geminiAnalysisTimer);
      geminiAnalysisTimer = null;
    }

    accumulatedEvents = [];
    socket.emit('session:ended');
  });

  // ============================================================================
  // STREAMING MODE: Start real-time streaming with ElevenLabs Realtime WebSocket
  // ============================================================================
  socket.on('stream:start', async () => {
    console.log(`🎙️ Starting realtime stream for ${socket.id}`);

    // Create realtime client if not exists
    if (!realtimeClient) {
      realtimeClient = createRealtimeClient();

      if (!realtimeClient) {
        socket.emit('error', { message: 'ElevenLabs API key not configured' });
        return;
      }

      realtimeClients.set(socket.id, realtimeClient);

      // Set up event handlers for real-time data
      realtimeClient.on('connected', () => {
        socket.emit('stream:connected');
        console.log(`✅ Realtime stream connected for ${socket.id}`);
      });

      realtimeClient.on('disconnected', (reason) => {
        socket.emit('stream:disconnected', { reason });
        console.log(`❌ Realtime stream disconnected for ${socket.id}: ${reason}`);
      });

      realtimeClient.on('error', (error) => {
        socket.emit('error', { message: error.message });
        console.error(`Realtime stream error for ${socket.id}:`, error);
      });

      // Handle real-time transcripts (~150ms latency)
      realtimeClient.on('transcript', (data) => {
        console.log(`📝 Transcript received: "${data.text}" (isFinal: ${data.isFinal})`);
        socket.emit('transcript:realtime', {
          text: data.text,
          isFinal: data.isFinal,
          words: data.words,
          timestamp: Date.now(),
        });
        console.log(`✅ Transcript emitted to client ${socket.id}`);
      });

      // Handle audio events INSTANTLY (~150ms latency)
      realtimeClient.on('audioEvent', (event) => {
        const interpretation = getQuickEventInterpretation(event.type);

        // Emit immediately for instant feedback
        socket.emit('event:detected', {
          event: event.type,
          interpretation,
          confidence: event.confidence,
          timestamp: event.timestamp,
        });

        // Accumulate for Gemini analysis
        if (!accumulatedEvents.includes(event.type)) {
          accumulatedEvents.push(event.type);
        }
      });

      // Handle speaker changes
      realtimeClient.on('speakerChange', (change) => {
        socket.emit('speaker:change', {
          speakerId: change.speakerId,
          timestamp: change.timestamp,
        });
      });
    }

    // Connect to ElevenLabs Realtime
    try {
      // FIX: Add null check - realtimeClient could be null if connection failed or was disconnected
      if (!realtimeClient) {
        socket.emit('error', { message: 'Realtime client not initialized' });
        return;
      }
      await realtimeClient.connect();
      (realtimeClient as ElevenLabsRealtimeClient).clearAccumulated();
      accumulatedEvents = [];

      // Start periodic Gemini analysis (every 5 seconds)
      geminiAnalysisTimer = setInterval(async () => {
        if (!realtimeClient) return;

        const transcript = (realtimeClient as ElevenLabsRealtimeClient).getAccumulatedTranscript();
        const events = (realtimeClient as ElevenLabsRealtimeClient).getDetectedEvents();

        // Only analyze if we have new data
        if (transcript.length === 0 && events.length === 0) return;
        if (Date.now() - lastAnalysisTime < GEMINI_ANALYSIS_INTERVAL - 1000) return;

        lastAnalysisTime = Date.now();

        try {
          const socialResult = await analyzeSocialContext({
            transcript,
            audioEvents: events,
            speakers: [],  // Speaker info from diarization
          });

          socket.emit('context:update', {
            timestamp: Date.now(),
            transcript,
            audioEvents: events,
            speakers: 0,
            assessment: socialResult.assessment,
            tone: socialResult.tone,
            summary: socialResult.summary,
            triggers: socialResult.triggers,
            confidence: socialResult.confidence,
            recommendations: socialResult.recommendations,
          });

          // Save to database
          if (mongoose.connection.readyState === 1 && currentSessionId) {
            try {
              const contextEvent = new ContextEvent({
                userId,
                sessionId: currentSessionId,
                timestamp: new Date(),
                audioEvents: events,
                transcript,
                speakers: 0,
                assessment: socialResult.assessment,
                summary: socialResult.summary,
                triggers: socialResult.triggers,
                confidence: socialResult.confidence,
                recommendations: socialResult.recommendations,
              });
              await contextEvent.save();
            } catch (dbError) {
              console.warn('Could not save context event to DB:', dbError);
            }
          }

          // Generate calming audio if stress detected
          if (socialResult.assessment === 'tense' || socialResult.triggers.length > 0) {
            const ttsResult = await generateCalmingPrompt(socialResult.summary);
            if (ttsResult.success && ttsResult.audioPath) {
              const filename = path.basename(ttsResult.audioPath);
              socket.emit('calming:audio', {
                audioUrl: `/api/tts/audio/${filename}`,
                summary: socialResult.summary,
              });
            }
          }

        } catch (analysisError) {
          console.warn('Gemini analysis error:', analysisError);
        }
      }, GEMINI_ANALYSIS_INTERVAL);

    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Failed to connect to realtime stream' });
    }
  });

  // Stop real-time streaming
  socket.on('stream:stop', () => {
    console.log(`🛑 Stopping realtime stream for ${socket.id}`);

    if (realtimeClient) {
      realtimeClient.disconnect();
      realtimeClients.delete(socket.id);
      realtimeClient = null;
    }

    if (geminiAnalysisTimer) {
      clearInterval(geminiAnalysisTimer);
      geminiAnalysisTimer = null;
    }

    accumulatedEvents = [];
    socket.emit('stream:stopped');
  });

  // Receive streaming audio data (raw PCM)
  let packetCount = 0;
  socket.on('audio:stream', (data: ArrayBuffer | Buffer | string) => {
    packetCount++;
    if (packetCount % 50 === 0) {
      console.log(`🔊 Received audio packet #${packetCount} from ${socket.id}`);
    }
    if (realtimeClient && realtimeClient.isActive()) {
      // Forward audio directly to ElevenLabs Realtime
      let audioBuffer: Buffer;
      if (typeof data === 'string') {
        // Base64 encoded
        audioBuffer = Buffer.from(data, 'base64');
      } else if (data instanceof ArrayBuffer) {
        audioBuffer = Buffer.from(new Uint8Array(data));
      } else {
        audioBuffer = data;
      }
      realtimeClient.sendAudio(audioBuffer);
    }
  });

  // ============================================================================
  // CHUNKED MODE: Process audio in chunks (legacy, kept for compatibility)
  // ============================================================================

  // Process incoming audio chunk
  socket.on('audio:chunk', async (data: {
    audio: string;  // Base64 encoded audio
    duration?: number;
    decibels?: number;
  }) => {
    console.log(`🎤 Received audio chunk from ${socket.id}`);

    try {
      // Decode base64 audio to buffer
      const audioBuffer = Buffer.from(data.audio, 'base64');

      // Step 1: Process audio with ElevenLabs (Voice Isolator + Scribe v2)
      socket.emit('status', { step: 'processing', message: 'Cleaning audio...' });

      const audioResult = await processContextAudio(audioBuffer, {
        skipIsolation: false,  // Use voice isolation for cleaner audio
        numSpeakers: 5,        // Expect teacher + students
      });

      if (!audioResult.success) {
        socket.emit('error', { message: audioResult.error || 'Audio processing failed' });
        return;
      }

      // Emit quick event interpretations immediately (low latency)
      for (const event of audioResult.audioEvents) {
        const quickInterpretation = getQuickEventInterpretation(event);
        socket.emit('event:detected', {
          event,
          interpretation: quickInterpretation,
          timestamp: Date.now(),
        });
      }

      // Step 2: Analyze social context with Gemini
      socket.emit('status', { step: 'analyzing', message: 'Understanding context...' });

      const socialResult = await analyzeSocialContext({
        transcript: audioResult.transcript,
        audioEvents: audioResult.audioEvents,
        speakers: audioResult.speakers,
        decibels: data.decibels,
      });

      // Step 3: Save to database (non-blocking)
      if (mongoose.connection.readyState === 1) {
        try {
          const contextEvent = new ContextEvent({
            userId,
            sessionId: currentSessionId,
            timestamp: new Date(),
            audioEvents: audioResult.audioEvents,
            transcript: audioResult.transcript,
            speakers: audioResult.speakers.length,
            decibels: data.decibels,
            assessment: socialResult.assessment,
            summary: socialResult.summary,
            triggers: socialResult.triggers,
            confidence: socialResult.confidence,
            recommendations: socialResult.recommendations,
            duration: data.duration,
          });
          await contextEvent.save();
        } catch (dbError) {
          console.warn('Could not save context event to DB:', dbError);
        }
      }

      // Step 4: Emit analysis result to client
      console.log(`📊 Context update - Transcript: "${audioResult.transcript}"`);
      console.log(`   Events: ${audioResult.audioEvents.join(', ')}, Speakers: ${audioResult.speakers.length}`);
      socket.emit('context:update', {
        timestamp: Date.now(),
        transcript: audioResult.transcript,
        audioEvents: audioResult.audioEvents,
        speakers: audioResult.speakers.length,
        assessment: socialResult.assessment,
        tone: socialResult.tone,
        summary: socialResult.summary,
        triggers: socialResult.triggers,
        confidence: socialResult.confidence,
        recommendations: socialResult.recommendations,
      });

      // Step 5: Generate calming audio if stress detected (optional)
      if (socialResult.assessment === 'tense' || socialResult.triggers.length > 0) {
        socket.emit('status', { step: 'generating', message: 'Creating calming response...' });

        const ttsResult = await generateCalmingPrompt(socialResult.summary);

        if (ttsResult.success && ttsResult.audioPath) {
          const filename = path.basename(ttsResult.audioPath);
          socket.emit('calming:audio', {
            audioUrl: `/api/tts/audio/${filename}`,
            summary: socialResult.summary,
          });
        }
      }

      socket.emit('status', { step: 'complete', message: 'Analysis complete' });

    } catch (error: any) {
      console.error('Audio processing error:', error);
      socket.emit('error', {
        message: error.message || 'Processing failed',
        step: 'processing',
      });
    }
  });

  // Handle user feedback on analysis
  socket.on('feedback', async (data: {
    eventId: string;
    feedback: 'helpful' | 'not_helpful' | 'incorrect';
    note?: string;
  }) => {
    try {
      if (mongoose.connection.readyState === 1) {
        await ContextEvent.findByIdAndUpdate(data.eventId, {
          userFeedback: data.feedback,
          userNote: data.note,
        });
        console.log(`📝 Feedback recorded for event ${data.eventId}`);
      }
    } catch (error) {
      console.warn('Could not save feedback:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    currentSessionId = null;

    // Clean up realtime client on disconnect
    if (realtimeClient) {
      realtimeClient.disconnect();
      realtimeClients.delete(socket.id);
      realtimeClient = null;
    }

    if (geminiAnalysisTimer) {
      clearInterval(geminiAnalysisTimer);
      geminiAnalysisTimer = null;
    }
  });
});

// Connect to MongoDB (optional - works without it using in-memory storage)
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      // Recommended connection options for MongoDB
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,           // Maximum number of connections in the pool
        serverSelectionTimeoutMS: 5000,  // Timeout for server selection
        socketTimeoutMS: 45000,    // Close sockets after 45s of inactivity
      });
      console.log('✅ Connected to MongoDB');

      // Seed context clues after connection is established
      await seedContextClues();
    } catch (error) {
      console.warn('⚠️ MongoDB connection failed, using in-memory storage');
      console.error(error);
    }
  } else {
    console.log('ℹ️ No MONGODB_URI provided, using in-memory storage');
  }
};

// Graceful shutdown - close MongoDB connection
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Closing MongoDB connection...`);
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server
const startServer = async () => {
  await connectDB();

  // Use httpServer instead of app.listen for Socket.io support
  httpServer.listen(PORT, () => {
    console.log(`
🌿 Whisper Lite Backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Server running on port ${PORT}
📡 API available at http://localhost:${PORT}/api
🔌 WebSocket enabled for real-time Context Clues
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  });
};

startServer();

export { io };  // Export io for use in other modules
export default app;
