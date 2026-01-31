import OpenAI from 'openai';
import { EmotionLog, Win, WeeklyInsight } from '../models/EmotionLog';
import Session from '../models/Session';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || 'dummy-key',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3001',
    'X-Title': 'Whisper Lite Dashboard',
  }
});

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
 * Generate AI insights using Gemini
 */
export async function generateGeminiInsights(
  aggregatedData: AggregatedWeeklyData
): Promise<{ insights: string[]; suggestions: string[] }> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  console.log('🔍 DEBUG: API Key loaded:', apiKey ? `${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 5)}` : 'NOT FOUND');
  console.log('🔍 DEBUG: API Key length:', apiKey?.length);

  // Return mock insights if no API key
  if (!apiKey) {
    console.log('⚠️  No API key found, using mock insights');
    return generateMockInsights(aggregatedData);
  }

  try {
    console.log('🚀 Attempting to call OpenRouter with model: google/gemini-2.5-flash');
    
    const completion = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: `You are a supportive school counselor analyzing a student's weekly emotional data for a mental wellness app. Generate 2-3 kind, encouraging insights and 1-2 actionable suggestions based on this week's data:

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
      .join(', ') || 'none'}

IMPORTANT RULES:
1. Always be positive and supportive
2. Use simple language (8th grade level)
3. Acknowledge their effort and resilience
4. Return ONLY valid JSON with exactly this structure (no markdown, no code blocks):
{"insights":["insight 1","insight 2"],"suggestions":["suggestion 1","suggestion 2"]}
5. Each insight should be 1-2 sentences
6. Each suggestion should start with an action verb (e.g., "Try", "Practice", "Consider")`
        }
      ],
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content || '';
    console.log('✅ OpenRouter response received');

    // Parse JSON response
    const parsed = JSON.parse(responseText);
    return {
      insights: parsed.insights || [],
      suggestions: parsed.suggestions || [],
    };

    return generateMockInsights(aggregatedData);
  } catch (error) {
    console.error('Error generating Gemini insights:', error);
    return generateMockInsights(aggregatedData);
  }
}

/**
 * Generate fallback mock insights
 */
export function generateMockInsights(aggregatedData: AggregatedWeeklyData): {
  insights: string[];
  suggestions: string[];
} {
  const insights: string[] = [];
  const suggestions: string[] = [];

  // Build insights based on data
  if (aggregatedData.totalEmotionLogs > 0) {
    insights.push(
      `You checked in on your feelings ${aggregatedData.totalEmotionLogs} times this week. That's great self-awareness!`
    );
  }

  if (aggregatedData.calmestTimeOfDay !== 'unknown') {
    insights.push(
      `You tend to feel calmer ${aggregatedData.calmestTimeOfDay}. Notice when you feel more peaceful.`
    );
  }

  if (aggregatedData.totalWins > 0) {
    insights.push(
      `You logged ${aggregatedData.totalWins} win${aggregatedData.totalWins > 1 ? 's' : ''} this week! You're building momentum.`
    );
  }

  if (aggregatedData.averageStressLevel > 6) {
    suggestions.push('Try using a breathing exercise when stress feels high—even 2 minutes helps.');
  }

  if (aggregatedData.mostStressfulContext !== 'unknown') {
    suggestions.push(`${aggregatedData.mostStressfulContext} feels challenging. You're not alone—many students feel this way.`);
  }

  if (aggregatedData.totalBreathingBreaks === 0 && aggregatedData.totalEmotionLogs > 0) {
    suggestions.push('Next time stress shows up, try a quick breathing break before jumping into the moment.');
  }

  return {
    insights: insights.length > 0 ? insights : ["You're doing the work to understand yourself better."],
    suggestions: suggestions.length > 0 ? suggestions : ['Keep checking in with yourself—awareness is the first step.'],
  };
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
    const { insights, suggestions } = await generateGeminiInsights(aggregatedData);

    // Try to save to database, but don't fail if it doesn't work
    let savedInsight = null;
    try {
      savedInsight = await saveWeeklyInsight(userId, aggregatedData, insights, suggestions);
    } catch (dbError) {
      console.warn('Could not save weekly insight to database:', dbError);
    }

    const { start, end } = getWeekBounds(weekOffset);

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
