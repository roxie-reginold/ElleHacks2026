import { Router, Request, Response } from 'express';
import Affirmation from '../models/Affirmation';

const router = Router();

// ─────────────────────────────────────
// CREATE & MANAGE AFFIRMATIONS
// ─────────────────────────────────────

/**
 * POST /api/affirmations
 * Save a new affirmation (student records voice or ElevenLabs generates it)
 * Body: { userId, text, audioUrl, triggers, isCustomVoice }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, text, audioUrl, triggers, isCustomVoice = true } = req.body;

    if (!userId || !text || !audioUrl || !triggers) {
      res.status(400).json({ error: 'userId, text, audioUrl, and triggers are required' });
      return;
    }

    if (!Array.isArray(triggers) || triggers.length === 0) {
      res.status(400).json({ error: 'triggers must be a non-empty array' });
      return;
    }

    const validTriggers = [
      'before_raising_hand',
      'group_work_starts',
      'stress_detected',
      'before_presentation',
      'post_class',
      'manual',
    ];

    const invalidTriggers = triggers.filter((t: string) => !validTriggers.includes(t));
    if (invalidTriggers.length > 0) {
      res.status(400).json({ error: `Invalid triggers: ${invalidTriggers.join(', ')}` });
      return;
    }

    const affirmation = new Affirmation({
      userId,
      text,
      audioUrl,
      triggers,
      isCustomVoice,
      timesPlayed: 0,
    });

    await affirmation.save();
    res.status(201).json(affirmation);
  } catch (error) {
    console.error('Affirmation create error:', error);
    res.status(500).json({ error: 'Failed to save affirmation' });
  }
});

/**
 * GET /api/affirmations/:userId
 * Get all affirmations for a student
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const affirmations = await Affirmation.find({ userId }).sort({ createdAt: -1 });
    res.json(affirmations);
  } catch (error) {
    console.error('Affirmations fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch affirmations' });
  }
});

// ─────────────────────────────────────
// TRIGGER-BASED PLAYBACK
// ─────────────────────────────────────

/**
 * GET /api/affirmations/:userId/trigger/:triggerType
 * Context clues or call-to-action fires a trigger → fetch the matching affirmation to play
 * Example: stress detected → GET /api/affirmations/abc123/trigger/stress_detected
 * Returns ONE random matching affirmation (so it doesn't always repeat the same one)
 */
router.get('/:userId/trigger/:triggerType', async (req: Request, res: Response) => {
  try {
    const { userId, triggerType } = req.params;

    const matches = await Affirmation.find({
      userId,
      triggers: triggerType,
    });

    if (matches.length === 0) {
      res.status(404).json({ error: 'No affirmation found for this trigger' });
      return;
    }

    // Pick a random one so it doesn't always repeat
    const random = matches[Math.floor(Math.random() * matches.length)];
    res.json(random);
  } catch (error) {
    console.error('Trigger fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch affirmation for trigger' });
  }
});

/**
 * PATCH /api/affirmations/:id/played
 * Increment the timesPlayed counter when an affirmation is played
 */
router.patch('/:id/played', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const affirmation = await Affirmation.findByIdAndUpdate(
      id,
      { $inc: { timesPlayed: 1 } },
      { new: true }
    );

    if (!affirmation) {
      res.status(404).json({ error: 'Affirmation not found' });
      return;
    }

    res.json({ timesPlayed: affirmation.timesPlayed });
  } catch (error) {
    console.error('Played update error:', error);
    res.status(500).json({ error: 'Failed to update play count' });
  }
});

/**
 * DELETE /api/affirmations/:id
 * Delete an affirmation
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await Affirmation.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({ error: 'Affirmation not found' });
      return;
    }

    res.json({ success: true, message: 'Affirmation deleted' });
  } catch (error) {
    console.error('Affirmation delete error:', error);
    res.status(500).json({ error: 'Failed to delete affirmation' });
  }
});

export default router;