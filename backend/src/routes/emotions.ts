import { Router, Request, Response } from 'express';
import { EmotionLog, Win, WeeklyInsight } from '../models/EmotionLog';

const router = Router();

// Helper: get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Helper: get Monday of current week
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─────────────────────────────────────
// EMOTION LOGS
// ─────────────────────────────────────

/**
 * POST /api/emotions
 * Log an emotion check-in (triggered after class or by call-to-action)
 * Body: { userId, emoji, context?, stressLevel?, sessionId?, notes? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, emoji, context, stressLevel, sessionId, notes } = req.body;

    if (!userId || !emoji) {
      res.status(400).json({ error: 'userId and emoji are required' });
      return;
    }

    const log = new EmotionLog({
      userId,
      emoji,
      context,
      stressLevel,
      sessionId,
      notes,
      timestamp: new Date(),
    });

    await log.save();
    res.status(201).json(log);
  } catch (error) {
    console.error('Emotion log error:', error);
    res.status(500).json({ error: 'Failed to save emotion log' });
  }
});

/**
 * GET /api/emotions/:userId
 * Get emotion logs for a user (last 7 days by default)
 * Query: ?days=7&context=group+work
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days as string) || 7;
    const context = req.query.context as string;

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const query: any = {
      userId,
      timestamp: { $gte: since },
    };

    if (context) {
      query.context = context;
    }

    const logs = await EmotionLog.find(query).sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Emotion logs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch emotion logs' });
  }
});

// ─────────────────────────────────────
// WINS
// ─────────────────────────────────────

/**
 * POST /api/emotions/wins
 * Log a win (triggered by Gemini after detecting a positive action)
 * Body: { userId, achievement, category, sessionId? }
 */
router.post('/wins', async (req: Request, res: Response) => {
  try {
    const { userId, achievement, category, sessionId } = req.body;

    if (!userId || !achievement || !category) {
      res.status(400).json({ error: 'userId, achievement, and category are required' });
      return;
    }

    const now = new Date();

    const win = new Win({
      userId,
      achievement,
      category,
      sessionId,
      timestamp: now,
      weekNumber: getWeekNumber(now),
      year: now.getFullYear(),
    });

    await win.save();
    res.status(201).json(win);
  } catch (error) {
    console.error('Win log error:', error);
    res.status(500).json({ error: 'Failed to save win' });
  }
});

/**
 * GET /api/emotions/wins/:userId
 * Get wins for a user (current week by default)
 * Query: ?week=current&category=social
 */
router.get('/wins/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const category = req.query.category as string;
    const now = new Date();

    const query: any = {
      userId,
      weekNumber: getWeekNumber(now),
      year: now.getFullYear(),
    };

    if (category) {
      query.category = category;
    }

    const wins = await Win.find(query).sort({ timestamp: -1 });
    res.json(wins);
  } catch (error) {
    console.error('Wins fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch wins' });
  }
});

// ─────────────────────────────────────
// WEEKLY INSIGHTS
// ─────────────────────────────────────

/**
 * POST /api/emotions/insights
 * Generate and save weekly insight (called by backend after aggregating data)
 * Body: { userId, insights, suggestions, stats }
 */
router.post('/insights', async (req: Request, res: Response) => {
  try {
    const { userId, insights, suggestions, stats } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Upsert: update if exists for this week, create if not
    const insight = await WeeklyInsight.findOneAndUpdate(
      { userId, weekStart },
      {
        weekEnd,
        insights: insights || [],
        suggestions: suggestions || [],
        stats: stats || {},
      },
      { new: true, upsert: true }
    );

    res.status(201).json(insight);
  } catch (error) {
    console.error('Insights save error:', error);
    res.status(500).json({ error: 'Failed to save insights' });
  }
});

/**
 * GET /api/emotions/insights/:userId
 * Get the current week's insight for a user
 */
router.get('/insights/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    const weekStart = getWeekStart(now);

    const insight = await WeeklyInsight.findOne({ userId, weekStart });

    if (!insight) {
      // Return empty structure if no insight generated yet this week
      res.json({
        insights: [],
        suggestions: [],
        stats: {
          totalEmotionLogs: 0,
          totalWins: 0,
          totalBreathingBreaks: 0,
          averageStressLevel: 0,
          calmestTimeOfDay: 'unknown',
          mostStressfulContext: 'unknown',
        },
      });
      return;
    }

    res.json(insight);
  } catch (error) {
    console.error('Insights fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

export default router;