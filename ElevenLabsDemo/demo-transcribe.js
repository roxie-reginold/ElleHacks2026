/**
 * ElevenLabs Speech-to-Text Demo (Scribe v2)
 * 
 * Demonstrates transcribing audio files with features:
 * - 90+ language support
 * - Dynamic Audio Tagging ([Laughter], [Applause], etc.)
 * - Speaker Diarization (up to 32 speakers)
 * - Word-level timestamps
 * 
 * Reference: https://elevenlabs.io/docs/api-reference/speech-to-text/convert
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY not found in .env file');
    process.exit(1);
  }

  console.log('🎧 ElevenLabs Speech-to-Text Demo (Scribe v2)\n');

  const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  // Check for audio files to transcribe
  const outputDir = path.join(__dirname, 'output');
  const backendAudioDir = path.join(__dirname, '../backend/audio');
  
  let audioFile = null;
  
  // Try to find an audio file
  if (fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.mp3'));
    if (files.length > 0) {
      audioFile = path.join(outputDir, files[0]);
    }
  }
  
  if (!audioFile && fs.existsSync(backendAudioDir)) {
    const files = fs.readdirSync(backendAudioDir).filter(f => f.endsWith('.mp3'));
    if (files.length > 0) {
      audioFile = path.join(backendAudioDir, files[files.length - 1]); // Most recent
    }
  }

  if (!audioFile) {
    console.log('⚠️ No audio file found. Run "npm run tts" first to generate one.');
    console.log('   Or place an MP3 file in the output/ folder.\n');
    
    // Create a simple demo with generated audio
    console.log('📝 Generating sample audio to transcribe...\n');
    
    const sampleText = "Hello, this is a test of the ElevenLabs transcription service. It can detect multiple speakers, audio events like laughter, and provide word-level timestamps.";
    
    const audioStream = await client.textToSpeech.convert('EXAVITQu4vr4xnSDxMaL', {
      text: sampleText,
      modelId: 'eleven_flash_v2_5',
    });
    
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    audioFile = path.join(outputDir, 'sample-for-transcription.mp3');
    fs.writeFileSync(audioFile, Buffer.concat(chunks));
    console.log(`✅ Generated: ${audioFile}\n`);
  }

  console.log(`🎵 Transcribing: ${path.basename(audioFile)}`);
  console.log('⏳ Processing with Scribe v2...\n');

  try {
    const startTime = Date.now();

    // Transcribe with Scribe v2
    const result = await client.speechToText.convert({
      file: fs.createReadStream(audioFile),
      modelId: 'scribe_v2',
      languageCode: 'en',
      tagAudioEvents: true,      // Detect [Laughter], [Applause], etc.
      diarize: true,             // Speaker diarization
      timestampsGranularity: 'word', // Word-level timestamps
    });

    const elapsed = Date.now() - startTime;

    console.log('📝 TRANSCRIPTION RESULT');
    console.log('═'.repeat(50));
    console.log(`\n${result.text}\n`);
    console.log('═'.repeat(50));
    
    // Display metadata
    console.log(`\n📊 Metadata:`);
    console.log(`   Language: ${result.language_code || 'en'}`);
    console.log(`   Processing time: ${elapsed}ms`);
    
    // Display words with timestamps (first 5)
    if (result.words && result.words.length > 0) {
      console.log(`\n⏱️ Word Timestamps (first 5):`);
      result.words.slice(0, 5).forEach((word, i) => {
        console.log(`   ${i + 1}. "${word.text}" [${word.start?.toFixed(2)}s - ${word.end?.toFixed(2)}s]`);
      });
      console.log(`   ... and ${result.words.length - 5} more words`);
    }

    // Check for audio events
    const audioEventRegex = /\[(Laughter|Applause|Music|Silence|Coughing)\]/gi;
    const events = result.text.match(audioEventRegex);
    if (events && events.length > 0) {
      console.log(`\n🎯 Audio Events Detected:`);
      events.forEach(e => console.log(`   ${e}`));
    }

    console.log('\n✅ Transcription complete!');

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

main().catch(console.error);
