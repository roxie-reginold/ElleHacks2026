/**
 * Example script to test ElevenLabs integration
 * Run with: ts-node examples/testElevenLabs.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🎙️  Testing ElevenLabs Integration\n');
console.log(`Loading .env from: ${envPath}`);
console.log(`API Key found: ${process.env.ELEVENLABS_API_KEY ? 'YES ✓' : 'NO ✗'}\n`);

async function main() {
  // Dynamic import AFTER dotenv is loaded
  const { textToSpeech, getVoices, generateCalmingPrompt } = await import('../src/services/elevenLabsService');

  // Test 1: Get available voices
  console.log('1️⃣  Fetching available voices...');
  const voices = await getVoices();
  if (voices) {
    console.log(`✅ Found ${voices.voices?.length || 0} voices`);
    if (voices.voices && voices.voices.length > 0) {
      console.log(`   First voice: ${voices.voices[0].name} (${voices.voices[0].voiceId})\n`);
    }
  } else {
    console.log('⚠️  No API key configured or error fetching voices\n');
  }

  // Test 2: Basic text-to-speech
  console.log('2️⃣  Converting text to speech...');
  const basicResult = await textToSpeech('Hello! This is a test of the ElevenLabs integration.');
  if (basicResult.success) {
    console.log(`✅ Audio generated successfully`);
    console.log(`   Path: ${basicResult.audioPath}`);
    console.log(`   Characters used: ${basicResult.characterCount}`);
    console.log(`   Request ID: ${basicResult.requestId}\n`);
  } else {
    console.log(`❌ Error: ${basicResult.error}\n`);
  }

  // Test 3: Generate calming prompt (optimized for stress detection)
  console.log('3️⃣  Generating calming prompt...');
  const calmingResult = await generateCalmingPrompt(
    "You're safe. This isn't about you. Take a deep breath."
  );
  if (calmingResult.success) {
    console.log(`✅ Calming audio generated`);
    console.log(`   Path: ${calmingResult.audioPath}`);
    console.log(`   Characters used: ${calmingResult.characterCount}\n`);
  } else {
    console.log(`❌ Error: ${calmingResult.error}\n`);
  }

  // Test 4: Custom voice settings
  console.log('4️⃣  Testing custom voice settings...');
  const customResult = await textToSpeech(
    'This message uses custom voice settings for a more stable, clear voice.',
    {
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
      stability: 0.8, // More stable
      similarityBoost: 0.9, // More clear
    }
  );
  if (customResult.success) {
    console.log(`✅ Custom audio generated`);
    console.log(`   Path: ${customResult.audioPath}\n`);
  } else {
    console.log(`❌ Error: ${customResult.error}\n`);
  }

  console.log('✨ Test complete!');
}

// Run the test
main().catch(console.error);
