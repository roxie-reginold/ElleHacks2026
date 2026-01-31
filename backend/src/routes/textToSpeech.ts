import { Router, Request, Response } from 'express';
import { textToSpeech, getVoices, streamTextToSpeech, generateCalmingPrompt } from '../services/elevenLabsService';
import fs from 'fs';
import path from 'path';

const router = Router();

/**
 * POST /api/tts
 * Convert text to speech
 * Body: { text: string, voiceId?: string, stability?: number, similarityBoost?: number }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { text, voiceId, stability, similarityBoost, modelId } = req.body;

    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const result = await textToSpeech(text, {
      voiceId,
      modelId,
      stability,
      similarityBoost,
    });

    if (!result.success) {
      res.status(500).json({ 
        error: result.error || 'Text-to-speech conversion failed' 
      });
      return;
    }

    // Return audio file path and metadata
    res.json({
      success: true,
      audioPath: result.audioPath,
      characterCount: result.characterCount,
      requestId: result.requestId,
    });
  } catch (error) {
    console.error('Text-to-speech error:', error);
    res.status(500).json({ 
      error: 'Text-to-speech failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/tts/stream
 * Stream text to speech (real-time)
 * Body: { text: string, voiceId?: string }
 */
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { text, voiceId, stability, similarityBoost, modelId } = req.body;

    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const audioStream = await streamTextToSpeech(text, {
      voiceId,
      modelId,
      stability,
      similarityBoost,
    });

    // Set appropriate headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Pipe the audio stream to response
    for await (const chunk of audioStream as any) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    console.error('Text-to-speech streaming error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Text-to-speech streaming failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * GET /api/tts/voices
 * Get list of available voices
 */
router.get('/voices', async (req: Request, res: Response) => {
  try {
    const voices = await getVoices();
    
    if (!voices) {
      res.status(503).json({ 
        error: 'ElevenLabs API not configured or unavailable' 
      });
      return;
    }

    res.json({ voices });
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch voices',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/tts/calming
 * Generate a calming prompt audio (optimized for Whisper Lite's stress detection)
 * Body: { prompt: string }
 */
router.post('/calming', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }

    const result = await generateCalmingPrompt(prompt);

    if (!result.success) {
      res.status(500).json({ 
        error: result.error || 'Calming prompt generation failed' 
      });
      return;
    }

    // Return audio file path and metadata
    res.json({
      success: true,
      audioPath: result.audioPath,
      characterCount: result.characterCount,
      requestId: result.requestId,
    });
  } catch (error) {
    console.error('Calming prompt generation error:', error);
    res.status(500).json({ 
      error: 'Calming prompt generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/tts/audio/:filename
 * Serve generated audio files from backend/audio directory
 */
router.get('/audio/:filename', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename as string;
    
    // Security check - only serve elevenlabs generated files
    if (!filename || !filename.startsWith('elevenlabs_')) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Construct path to audio file in backend/audio directory
    const audioPath = path.join(__dirname, '../../audio', filename);

    if (!fs.existsSync(audioPath)) {
      res.status(404).json({ error: 'Audio file not found' });
      return;
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    const audioStream = fs.createReadStream(audioPath);
    audioStream.pipe(res);
  } catch (error) {
    console.error('Error serving audio:', error);
    res.status(500).json({ error: 'Failed to serve audio file' });
  }
});

export default router;
