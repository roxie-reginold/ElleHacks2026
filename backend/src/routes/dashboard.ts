import { Router, Request, Response } from 'express';
import Session from '../models/Session';
import Recap from '../models/Recap';

const router = Router();

interface WeeklyStats {
  totalSessions: number;
  calmMoments: number;
  triggersEncountered: number;
  breathingUsed: number;
  journalsSaved: number;
}

interface PatternInsight {
  text: string;
  type: 'positive' | 'neutral' | 'suggestion';
}

interface TriggerCount {
  type: string;
  count: number;
}

/**
 * GET /api/dashboard/weekly
 * Get weekly dashboard stats and insights
 */
router.get('/weekly', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Fetch sessions from the past week
    let sessions: any[] = [];
    let recaps: any[] = [];

    try {
      sessions = await Session.find({
        userId,
        startedAt: { $gte: weekAgo },
      }).sort({ startedAt: -1 });

      recaps = await Recap.find({
        userId,
        createdAt: { $gte: weekAgo },
      });
    } catch (dbError) {
      console.warn('DB query failed, returning empty stats:', dbError);
    }

    // Calculate stats
    const stats: WeeklyStats = {
      totalSessions: sessions.length,
      calmMoments: sessions.reduce((acc, s) => acc + (s.calmMinutes || 0), 0),
      triggersEncountered: sessions.filter(s => s.detections?.overallState === 'stressor_detected').length,
      breathingUsed: sessions.filter(s => s.interventionsUsed?.breatheUsed).length,
      journalsSaved: recaps.length,
    };

    // Generate pattern insights
    const insights: PatternInsight[] = generateInsights(sessions, stats);

    // Calculate top triggers
    const topTriggers: TriggerCount[] = calculateTopTriggers(sessions);

    res.json({
      stats,
      insights,
      topTriggers,
      period: {
        start: weekAgo.toISOString(),
        end: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
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

/**
 * Generate pattern insights from session data
 */
function generateInsights(sessions: any[], stats: WeeklyStats): PatternInsight[] {
  const insights: PatternInsight[] = [];

  // Session count insight
  if (stats.totalSessions > 0) {
    insights.push({
      text: `You've had ${stats.totalSessions} session${stats.totalSessions > 1 ? 's' : ''} this week.`,
      type: 'neutral',
    });
  }

  // Calm moments insight
  if (stats.calmMoments > 0) {
    insights.push({
      text: `${stats.calmMoments} calm minutes recorded. That's great!`,
      type: 'positive',
    });
  }

  // Breathing usage insight
  if (stats.breathingUsed > 0) {
    insights.push({
      text: `You used breathing exercises ${stats.breathingUsed} time${stats.breathingUsed > 1 ? 's' : ''}. Self-care matters.`,
      type: 'positive',
    });
  }

  // Day pattern analysis
  const dayPatterns = analyzeDayPatterns(sessions);
  if (dayPatterns) {
    insights.push(dayPatterns);
  }

  // Trigger handling insight
  if (stats.triggersEncountered > 0) {
    insights.push({
      text: `You got through ${stats.triggersEncountered} challenging moment${stats.triggersEncountered > 1 ? 's' : ''}. You're building resilience.`,
      type: 'positive',
    });
  }

  // Suggestion if no sessions
  if (stats.totalSessions === 0) {
    insights.push({
      text: 'Start a session to see your patterns here.',
      type: 'suggestion',
    });
  }

  return insights;
}

/**
 * Analyze which days tend to be calmer
 */
function analyzeDayPatterns(sessions: any[]): PatternInsight | null {
  if (sessions.length < 3) return null;

  const dayStats: { [key: number]: { calm: number; total: number } } = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  sessions.forEach(session => {
    const day = new Date(session.startedAt).getDay();
    if (!dayStats[day]) {
      dayStats[day] = { calm: 0, total: 0 };
    }
    dayStats[day].total++;
    if (session.detections?.overallState === 'calm') {
      dayStats[day].calm++;
    }
  });

  // Find the calmest day
  let calmestDay = -1;
  let bestRatio = 0;

  Object.entries(dayStats).forEach(([day, stats]) => {
    const ratio = stats.calm / stats.total;
    if (ratio > bestRatio && stats.total >= 2) {
      bestRatio = ratio;
      calmestDay = parseInt(day);
    }
  });

  if (calmestDay >= 0 && bestRatio > 0.5) {
    return {
      text: `You tend to feel calmer on ${dayNames[calmestDay]}s.`,
      type: 'positive',
    };
  }

  return null;
}

/**
 * Calculate top trigger types
 */
function calculateTopTriggers(sessions: any[]): TriggerCount[] {
  const triggerCounts: { [key: string]: number } = {};

  sessions.forEach(session => {
    if (session.detections?.events) {
      session.detections.events.forEach((event: any) => {
        triggerCounts[event.type] = (triggerCounts[event.type] || 0) + 1;
      });
    }
  });

  return Object.entries(triggerCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export default router;
