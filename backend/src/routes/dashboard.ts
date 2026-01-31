import { Router, Request, Response } from 'express';
import Session from '../models/Session';
import Recap from '../models/Recap';
import { getWeeklyDashboard, getWeeklyTrends } from '../services/weeklyDashboard';

const router = Router();

/**
 * GET /api/dashboard/weekly
 * Get weekly dashboard stats and insights with Gemini AI analysis
 * Query params: userId (required), weekOffset (optional, default 0 for current week)
 */
router.get('/weekly', async (req: Request, res: Response) => {
  try {
    const { userId, weekOffset } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const offset = weekOffset ? parseInt(weekOffset as string) : 0;
    const dashboard = await getWeeklyDashboard(userId as string, offset);

    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/dashboard/trends
 * Get trend analysis across multiple weeks
 * Query params: userId (required), numWeeks (optional, default 4)
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const { userId, numWeeks } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const weeks = numWeeks ? parseInt(numWeeks as string) : 4;
    const trends = await getWeeklyTrends(userId as string, weeks);

    res.json(trends);
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

/**
 * GET /api/dashboard/session/:sessionId
 * Get details for a specific session
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(session);
  } catch (error) {
    console.error('Session fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

export default router;
