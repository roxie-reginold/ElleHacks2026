import OpenAI from 'openai';
import { EmotionLog, Win, WeeklyInsight } from '../models/EmotionLog';
import Session from '../models/Session';

// Initialize OpenRouter client (OpenAI-compatible) for Gemini
const openrouter = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'https://whisper-lite.app',
        'X-Title': 'Whisper Lite',
      },
    })
  : null;

// OpenRouter model for Gemini
const GEMINI_MODEL = 'google/gemini-2.5-flash';

export interface AggregatedWeeklyData {
  emotionLogs: any[];
  wins: any[];
  sessions: any[];
  totalEmotionLogs: number;
  totalWins: number;
  totalBreathingBreaks: number;
  averageStressLevel: number;
  calmestTimeOfDay: string;
  mostStressfulContext: string;
  timeDistribution: {
    morning: number;
    afternoon: number;
    evening: number;
  };
  contextDistribution: { [key: string]: number };
}

/**
 * Get the Monday and Sunday of a given week
 * weekOffset: 0 = current week, -1 = last week, etc.
 */
export function getWeekBounds(weekOffset: number = 0): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday is 0
  
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  // Apply week offset (7 days per week)
  const offsetDays = weekOffset * 7;
  weekStart.setDate(weekStart.getDate() + offsetDays);
  weekEnd.setDate(weekEnd.getDate() + offsetDays);
  
  return { start: weekStart, end: weekEnd };
}

/**
 * Extract time of day category from a timestamp
 */
export function getTimeOfDay(timestamp: Date): 'morning' | 'afternoon' | 'evening' {
  const hour = timestamp.getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Build mood-by-day for the week (Mon–Sun). Mood 1–5 from stress level 0–4 (5 - stress).
 * No logs for a day => mood 3 (okay).
 */
function buildMoodDataByDay(
  weekStart: Date,
  emotionLogs: { timestamp: Date; stressLevel?: number }[]
): { day: string; mood: number }[] {
  return DAY_NAMES.map((day, i) => {
    const dayStart = new Date(weekStart);
    dayStart.setDate(weekStart.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const logs = emotionLogs.filter(
      (log) => log.timestamp >= dayStart && log.timestamp <= dayEnd
    );
    if (logs.length === 0) return { day, mood: 3 };
    const avgStress =
      logs.reduce((s, l) => s + (l.stressLevel ?? 2), 0) / logs.length;
    const mood = Math.round(5 - Math.max(0, Math.min(4, avgStress)));
    return { day, mood: Math.max(1, Math.min(5, mood)) };
  });
}

/**
 * Derive top mood label from emotion logs (most common stress level -> label).
 */
function getTopMoodFromLogs(
  emotionLogs: { stressLevel?: number }[]
): string {
  if (emotionLogs.length === 0) return '—';
  const levels = emotionLogs.map((l) => l.stressLevel ?? 2);
  const counts: Record<number, number> = {};
  levels.forEach((l) => {
    counts[l] = (counts[l] || 0) + 1;
  });
  const most = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const stressToLabel: Record<number, string> = {
    0: 'Great',
    1: 'Good',
    2: 'Okay',
    3: 'Tough',
    4: 'Hard',
  };
  return stressToLabel[Number(most[0])] ?? 'Okay';
}

/**
 * Aggregate all weekly data for a user
 */
export async function aggregateWeeklyData(
  userId: string,
  weekOffset: number = 0
): Promise<AggregatedWeeklyData> {
  const { start, end } = getWeekBounds(weekOffset);

  try {
    // Fetch all data for the week in parallel
    const [emotionLogs, wins, sessions] = await Promise.all([
      EmotionLog.find({
        userId,
        timestamp: { $gte: start, $lte: end },
      }).sort({ timestamp: -1 }),
      Win.find({
        userId,
        timestamp: { $gte: start, $lte: end },
      }).sort({ timestamp: -1 }),
      Session.find({
        userId,
        startedAt: { $gte: start, $lte: end },
      }).sort({ startedAt: -1 }),
    ]);

    // Calculate metrics
    const timeDistribution = { morning: 0, afternoon: 0, evening: 0 };
    const contextDistribution: { [key: string]: number } = {};
    const stressLevels: number[] = [];

    emotionLogs.forEach(log => {
      const timeOfDay = getTimeOfDay(log.timestamp);
      timeDistribution[timeOfDay]++;

      if (log.context) {
        contextDistribution[log.context] = (contextDistribution[log.context] || 0) + 1;
      }

      if (log.stressLevel) {
        stressLevels.push(log.stressLevel);
      }
    });

    // Calculate calmest time of day
    let calmestTimeOfDay = 'unknown';
    if (Object.values(timeDistribution).some(v => v > 0)) {
      const maxTime = Object.entries(timeDistribution).reduce((max, [time, count]) =>
        count > max[1] ? [time, count] : max
      );
      calmestTimeOfDay = maxTime[0];
    }

    // Calculate most stressful context
    let mostStressfulContext = 'unknown';
    if (Object.keys(contextDistribution).length > 0) {
      const maxContext = Object.entries(contextDistribution).reduce((max, [context, count]) =>
        count > max[1] ? [context, count] : max
      );
      mostStressfulContext = maxContext[0];
    }

    // Calculate average stress level
    const averageStressLevel =
      stressLevels.length > 0
        ? Math.round((stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length) * 10) / 10
        : 0;

    // Count breathing breaks
    const totalBreathingBreaks = sessions.filter(s => s.interventionsUsed?.breatheUsed).length;

    return {
      emotionLogs,
      wins,
      sessions,
      totalEmotionLogs: emotionLogs.length,
      totalWins: wins.length,
      totalBreathingBreaks,
      averageStressLevel,
      calmestTimeOfDay,
      mostStressfulContext,
      timeDistribution,
      contextDistribution,
    };
  } catch (error) {
    console.error('Error aggregating weekly data:', error);
    throw error;
  }
}

/**
 * Generate AI insights using Gemini via OpenRouter
 */
export async function generateGeminiInsights(
  aggregatedData: AggregatedWeeklyData
): Promise<{ insights: string[]; suggestions: string[] }> {
  if (!openrouter) {
    console.error('No OpenRouter API key configured - insights unavailable');
    throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY environment variable.');
  }

  const systemPrompt = `You are a supportive school counselor analyzing a student's weekly emotional data for a mental wellness app.

IMPORTANT RULES:
1. Always be positive and supportive
2. Use simple language (8th grade level)
3. Acknowledge their effort and resilience
4. Each insight should be 1-2 sentences
5. Each suggestion should start with an action verb (e.g., "Try", "Practice", "Consider")

Return JSON with:
- insights: array of 2-3 kind, encouraging insight strings
- suggestions: array of 1-2 actionable suggestion strings`;

  const userPrompt = `Generate 2-3 kind, encouraging insights and 1-2 actionable suggestions based on this week's data:

Emotion Check-ins: ${aggregatedData.totalEmotionLogs} logged
- Average stress level: ${aggregatedData.averageStressLevel}/10
- Calmest time of day: ${aggregatedData.calmestTimeOfDay}
- Most stressful context: ${aggregatedData.mostStressfulContext}

Wins/Achievements logged: ${aggregatedData.totalWins}
Breathing exercises used: ${aggregatedData.totalBreathingBreaks} times

Insights about emotional patterns:
- Time distribution: ${JSON.stringify(aggregatedData.timeDistribution)}
- Context challenges: ${Object.entries(aggregatedData.contextDistribution)
      .map(([ctx, count]) => `${ctx} (${count})`)
      .join(', ') || 'none'}`;

  try {
    const response = await openrouter.chat.completions.create({
      model: GEMINI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = response.choices[0]?.message?.content || '{}';

    // Parse JSON response, handling potential markdown code blocks
    let parsed: any;
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                       responseText.match(/```\s*([\s\S]*?)\s*```/) ||
                       responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      parsed = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.warn('Failed to parse Gemini JSON response for insights');
      parsed = { insights: [], suggestions: [] };
    }

    console.log('Gemini weekly insights generated successfully via OpenRouter');

    return {
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch (error: any) {
    console.error('Gemini insights generation error:', error);
    throw new Error(`Insights generation failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Save or update weekly insight in database
 */
export async function saveWeeklyInsight(
  userId: string,
  aggregatedData: AggregatedWeeklyData,
  insights: string[],
  suggestions: string[]
): Promise<any> {
  const { start, end } = getWeekBounds(0);

  try {
    const weeklyInsight = await WeeklyInsight.findOneAndUpdate(
      { userId, weekStart: start },
      {
        userId,
        weekStart: start,
        weekEnd: end,
        insights,
        suggestions,
        stats: {
          totalEmotionLogs: aggregatedData.totalEmotionLogs,
          totalWins: aggregatedData.totalWins,
          totalBreathingBreaks: aggregatedData.totalBreathingBreaks,
          averageStressLevel: aggregatedData.averageStressLevel,
          calmestTimeOfDay: aggregatedData.calmestTimeOfDay,
          mostStressfulContext: aggregatedData.mostStressfulContext,
        },
      },
      { upsert: true, new: true }
    );

    return weeklyInsight;
  } catch (error) {
    console.error('Error saving weekly insight:', error);
    throw error;
  }
}

/**
 * Get complete weekly dashboard data
 */
export async function getWeeklyDashboard(userId: string, weekOffset: number = 0) {
  try {
    const aggregatedData = await aggregateWeeklyData(userId, weekOffset);
    let insights: string[] = [];
    let suggestions: string[] = [];
    try {
      const result = await generateGeminiInsights(aggregatedData);
      insights = result.insights;
      suggestions = result.suggestions;
    } catch (insightError) {
      console.warn('Weekly insights unavailable (OpenRouter or Gemini):', insightError);
      if (aggregatedData.totalEmotionLogs > 0) {
        insights = ["You're building a habit of checking in with yourself. Keep it up."];
        suggestions = ["Try logging how you feel at different times to spot patterns."];
      }
    }

    // Try to save to database, but don't fail if it doesn't work
    let savedInsight = null;
    try {
      savedInsight = await saveWeeklyInsight(userId, aggregatedData, insights, suggestions);
    } catch (dbError) {
      console.warn('Could not save weekly insight to database:', dbError);
    }

    const { start, end } = getWeekBounds(weekOffset);

    const moodDataByDay = buildMoodDataByDay(start, aggregatedData.emotionLogs);
    const topMood = getTopMoodFromLogs(aggregatedData.emotionLogs);

    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      stats: {
        totalEmotionLogs: aggregatedData.totalEmotionLogs,
        totalWins: aggregatedData.totalWins,
        totalBreathingBreaks: aggregatedData.totalBreathingBreaks,
        averageStressLevel: aggregatedData.averageStressLevel,
      },
      patterns: {
        calmestTimeOfDay: aggregatedData.calmestTimeOfDay,
        mostStressfulContext: aggregatedData.mostStressfulContext,
        timeDistribution: aggregatedData.timeDistribution,
        contextPatterns: aggregatedData.contextDistribution,
      },
      moodDataByDay,
      topMood,
      insights,
      suggestions,
      recentEmotionLogs: aggregatedData.emotionLogs.slice(0, 7), // Last 7 for timeline
      recentWins: aggregatedData.wins.slice(0, 5), // Last 5 wins
    };
  } catch (error) {
    console.error('Error generating weekly dashboard:', error);
    throw error;
  }
}

/**
 * Get multiple weeks of dashboard data for trend analysis
 */
export async function getWeeklyTrends(userId: string, numWeeks: number = 4) {
  try {
    const trends = [];

    for (let i = 0; i < numWeeks; i++) {
      const weekData = await getWeeklyDashboard(userId, -i);
      trends.push(weekData);
    }

    return {
      weeks: trends.reverse(), // Oldest first
      currentWeek: trends[trends.length - 1],
      trend: calculateTrend(trends),
    };
  } catch (error) {
    console.error('Error getting weekly trends:', error);
    throw error;
  }
}

/**
 * Calculate if stress is trending up or down
 */
function calculateTrend(weeks: any[]): 'improving' | 'stable' | 'declining' {
  if (weeks.length < 2) return 'stable';

  const firstWeek = weeks[0].stats.averageStressLevel;
  const lastWeek = weeks[weeks.length - 1].stats.averageStressLevel;

  const change = firstWeek - lastWeek;

  if (change > 1) return 'improving';
  if (change < -1) return 'declining';
  return 'stable';
}
