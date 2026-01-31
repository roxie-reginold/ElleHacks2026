import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { analyzeAudio, analyzeTranscript } from '../services/audioAnalysis';
import Session from '../models/Session';

const router = Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `audio-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/m4a',
      'audio/mp4',
      'audio/ogg',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type'));
    }
  },
});

/**
 * POST /api/analyze
 * Analyze audio for stress detection
 */
router.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const { userId, transcript: providedTranscript, sensitivity = 'med' } = req.body;
    const audioFile = req.file;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    let result;

    if (audioFile) {
      // Analyze uploaded audio file
      result = await analyzeAudio(
        audioFile.path,
        sensitivity as 'low' | 'med' | 'high',
        providedTranscript
      );

      // Clean up uploaded file after processing
      fs.unlink(audioFile.path, (err) => {
        if (err) console.warn('Could not delete temp file:', err);
      });
    } else if (providedTranscript) {
      // Analyze provided transcript directly
      result = await analyzeTranscript(providedTranscript, sensitivity as 'low' | 'med' | 'high');
    } else {
      res.status(400).json({ error: 'Either audio file or transcript is required' });
      return;
    }

    // Save session to database if MongoDB is connected
    try {
      const session = new Session({
        userId,
        startedAt: new Date(),
        transcript: result.transcript,
        detections: result.detections,
        interventionsUsed: {
          hapticSent: result.uiState === 'amber',
        },
        calmMinutes: result.uiState === 'green' ? 5 : 2,
      });
      await session.save();
    } catch (dbError) {
      // Log but don't fail if DB save fails
      console.warn('Could not save session to DB:', dbError);
    }

    res.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/analyze/transcript
 * Analyze text transcript directly (no audio)
 */
router.post('/transcript', async (req: Request, res: Response) => {
  try {
    const { userId, transcript, sensitivity = 'med' } = req.body;

    if (!userId || !transcript) {
      res.status(400).json({ error: 'userId and transcript are required' });
      return;
    }

    const result = await analyzeTranscript(transcript, sensitivity as 'low' | 'med' | 'high');

    res.json(result);
  } catch (error) {
    console.error('Transcript analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

export default router;
