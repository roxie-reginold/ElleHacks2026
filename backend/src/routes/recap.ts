import { Router, Request, Response } from 'express';
import { generateRecap } from '../services/recapGeneration';
import Recap from '../models/Recap';

const router = Router();

/**
 * POST /api/recap
 * Generate a recap from transcript at specified reading level
 * Body: { userId, sessionId, transcript, readingLevelGrade, generateAudio? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, sessionId, transcript, readingLevelGrade = 7, generateAudio = false } = req.body;

    if (!userId || !transcript) {
      res.status(400).json({ error: 'userId and transcript are required' });
      return;
    }

    // Validate reading level
    const level = Math.min(10, Math.max(6, parseInt(readingLevelGrade)));

    // Generate recap (with optional audio via ElevenLabs)
    const result = await generateRecap(transcript, level, generateAudio);

    // Save to database if MongoDB is connected
    try {
      const recap = new Recap({
        sessionId: sessionId || `session-${Date.now()}`,
        userId,
        readingLevelGrade: level,
        summaryText: result.summaryText,
        keyTerms: result.keyTerms,
        audioUrl: result.audioUrl,
      });
      await recap.save();
    } catch (dbError) {
      console.warn('Could not save recap to DB:', dbError);
    }

    res.json(result);
  } catch (error) {
    console.error('Recap generation error:', error);
    res.status(500).json({ error: 'Failed to generate recap' });
  }
});

/**
 * GET /api/recap/:sessionId
 * Get an existing recap by session ID
 */
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { readingLevelGrade } = req.query;

    const query: any = { sessionId };
    if (readingLevelGrade) {
      query.readingLevelGrade = parseInt(readingLevelGrade as string);
    }

    const recap = await Recap.findOne(query).sort({ createdAt: -1 });

    if (!recap) {
      res.status(404).json({ error: 'Recap not found' });
      return;
    }

    res.json({
      summaryText: recap.summaryText,
      keyTerms: recap.keyTerms,
      audioUrl: recap.audioUrl,
      readingLevelGrade: recap.readingLevelGrade,
    });
  } catch (error) {
    console.error('Recap fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch recap' });
  }
});

/**
 * GET /api/recap/user/:userId
 * Get all recaps for a user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    const recaps = await Recap.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .select('sessionId summaryText keyTerms readingLevelGrade createdAt');

    res.json(recaps);
  } catch (error) {
    console.error('Recaps fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch recaps' });
  }
});

export default router;
