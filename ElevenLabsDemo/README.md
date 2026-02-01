# ElevenLabs Demo

Simple demos showcasing ElevenLabs capabilities for:
- **Text-to-Speech (TTS)** - Convert text to natural-sounding speech
- **Speech-to-Text (Transcription)** - Transcribe audio files
- **Real-time Transcription** - Stream audio for live transcription

## Setup

1. Install dependencies:
```bash
cd ElevenLabsDemo
npm install
```

2. Ensure your `.env` file in the project root has:
```
ELEVENLABS_API_KEY=your_api_key_here
```

## Demos

### 1. Text-to-Speech Demo
Converts text to speech and saves as MP3.

```bash
npm run tts
```

### 2. Audio Transcription Demo
Transcribes an audio file using Scribe v2.

```bash
npm run transcribe
```

### 3. Real-time Transcription Demo (WebSocket test)
Connects to ElevenLabs WebSocket for live transcription.

```bash
npm run realtime
```

### 4. 🎤 Microphone Demo (Recommended!)
**Speak into your microphone and see real-time transcription!**

Make sure the backend is running first:
```bash
cd ../backend && npm run dev
```

Then open the demo:
```bash
npm run mic
```

Or manually open `demo-realtime-mic.html` in your browser.

## API Reference

Based on [ElevenLabs Documentation](https://elevenlabs.io/docs/creative-platform/overview):

- **TTS Models**: `eleven_flash_v2_5` (fast), `eleven_turbo_v2_5` (balanced), `eleven_multilingual_v2` (natural)
- **STT Model**: `scribe_v2` for transcription with audio tagging
- **Realtime STT**: `scribe_v2_realtime` for streaming transcription (~150ms latency)

## Features Demonstrated

| Feature | Model | Latency |
|---------|-------|---------|
| Text-to-Speech | eleven_flash_v2_5 | ~75ms |
| Transcription | scribe_v2 | Batch |
| Realtime STT | scribe_v2_realtime | ~150ms |
