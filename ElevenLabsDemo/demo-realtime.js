/**
 * ElevenLabs Real-time Transcription Demo (Scribe v2 Realtime)
 * 
 * Demonstrates real-time speech-to-text via WebSocket with ~150ms latency.
 * 
 * Reference: https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime
 * 
 * Message Types:
 * - input_audio_chunk: Send base64-encoded audio
 * - partial_transcript: Live transcription updates
 * - committed_transcript: Finalized transcript segments
 */

import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// WebSocket configuration
const WS_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';
const MODEL_ID = 'scribe_v2_realtime';

async function main() {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY not found in .env file');
    process.exit(1);
  }

  console.log('🎙️ ElevenLabs Real-time Transcription Demo\n');
  console.log('This demo connects to the Scribe v2 Realtime WebSocket API');
  console.log('and simulates sending audio chunks for transcription.\n');

  // Build WebSocket URL with query parameters
  const url = new URL(WS_URL);
  url.searchParams.set('model_id', MODEL_ID);
  url.searchParams.set('language_code', 'en');
  url.searchParams.set('audio_format', 'pcm_16000');  // 16kHz PCM
  url.searchParams.set('commit_strategy', 'vad');     // Voice Activity Detection
  url.searchParams.set('include_timestamps', 'true');

  console.log('🔌 Connecting to ElevenLabs Realtime WebSocket...');
  console.log(`   URL: ${WS_URL}`);
  console.log(`   Model: ${MODEL_ID}\n`);

  // Connect with API key in header
  const ws = new WebSocket(url.toString(), {
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
    },
  });

  let sessionId = null;
  let transcriptParts = [];

  ws.on('open', () => {
    console.log('✅ Connected to ElevenLabs Realtime\n');
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      const messageType = message.message_type;

      switch (messageType) {
        case 'session_started':
          sessionId = message.session_id;
          console.log(`📡 Session started: ${sessionId}`);
          console.log(`   Config: ${JSON.stringify(message.config, null, 2)}\n`);
          
          // Start sending audio after session starts
          sendDemoAudio(ws);
          break;

        case 'partial_transcript':
          // Live transcript update (not final)
          process.stdout.write(`\r📝 Partial: "${message.text}"                    `);
          break;

        case 'committed_transcript':
          // Finalized transcript segment
          console.log(`\n✅ Final: "${message.text}"`);
          transcriptParts.push(message.text);
          break;

        case 'committed_transcript_with_timestamps':
          // Finalized with word timestamps
          console.log(`\n✅ Final (with timestamps): "${message.text}"`);
          if (message.words) {
            console.log(`   Words: ${message.words.length}`);
          }
          transcriptParts.push(message.text);
          break;

        default:
          // Handle errors
          if (messageType?.includes('error')) {
            console.error(`\n❌ Error: ${messageType} - ${message.message || 'Unknown'}`);
          }
      }
    } catch (e) {
      // Non-JSON message (binary audio, etc.)
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`\n🔌 Disconnected (code: ${code})`);
    
    if (transcriptParts.length > 0) {
      console.log('\n📋 Full Transcript:');
      console.log('═'.repeat(50));
      console.log(transcriptParts.join(' '));
      console.log('═'.repeat(50));
    }
    
    console.log('\n✅ Demo complete!');
  });

  ws.on('error', (error) => {
    console.error(`\n❌ WebSocket error: ${error.message}`);
  });

  // Timeout to close connection after demo
  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log('\n⏱️ Demo timeout - closing connection...');
      ws.close();
    }
  }, 15000);
}

/**
 * Send demo audio chunks to the WebSocket
 * In a real app, this would come from a microphone
 */
async function sendDemoAudio(ws) {
  console.log('🎤 Sending demo audio chunks...\n');

  // Generate synthetic audio (silence with some noise to trigger VAD)
  // In production, this would be real microphone data
  const sampleRate = 16000;
  const chunkDurationMs = 100;
  const samplesPerChunk = (sampleRate * chunkDurationMs) / 1000;
  const bytesPerSample = 2; // 16-bit PCM
  const chunkSize = samplesPerChunk * bytesPerSample;

  // Send a few audio chunks to demonstrate the connection
  for (let i = 0; i < 10; i++) {
    if (ws.readyState !== WebSocket.OPEN) break;

    // Create a chunk with low-amplitude noise (simulates quiet audio)
    const chunk = Buffer.alloc(chunkSize);
    for (let j = 0; j < chunk.length; j += 2) {
      // Low amplitude noise
      const sample = Math.floor(Math.random() * 100 - 50);
      chunk.writeInt16LE(sample, j);
    }

    // Send as input_audio_chunk message
    const message = {
      message_type: 'input_audio_chunk',
      audio_base_64: chunk.toString('base64'),
      sample_rate: sampleRate,
    };

    ws.send(JSON.stringify(message));
    
    // Small delay between chunks
    await new Promise(resolve => setTimeout(resolve, chunkDurationMs));
  }

  console.log('📤 Sent 10 audio chunks (1 second of audio)');
  console.log('   Note: This is synthetic silence - no speech to transcribe');
  console.log('   In production, real microphone audio would produce transcripts\n');

  // Send commit to finalize any pending transcript
  ws.send(JSON.stringify({ message_type: 'commit' }));

  // Close after a short delay
  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }, 3000);
}

main().catch(console.error);
