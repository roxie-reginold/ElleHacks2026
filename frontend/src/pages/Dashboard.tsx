import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { getWeeklyDashboard } from '../services/api';

interface WeeklyStats {
  totalSessions?: number;
  calmMoments?: number;
  triggersEncountered?: number;
  breathingUsed?: number;
  journalsSaved?: number;
  // Backend format
  totalEmotionLogs?: number;
  totalWins?: number;
  totalBreathingBreaks?: number;
  averageStressLevel?: number;
}

interface PatternInsight {
  text: string;
  type: 'positive' | 'neutral' | 'suggestion';
}

interface Session {
  id: string;
  startedAt: string;
  endedAt: string;
  calmMinutes: number;
  stressorDetected: boolean;
  interventionsUsed: {
    breatheUsed: boolean;
  };
}

export default function Dashboard() {
  const { user } = useUser();
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [insights, setInsights] = useState<PatternInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user?._id]);

  const loadDashboardData = async () => {
    setLoading(true);

    // Try to fetch from API first
    try {
      const data = await getWeeklyDashboard(user?._id || 'demo-user');
      
      // Map backend response to frontend format
      const mappedStats: WeeklyStats = {
        totalSessions: data.stats?.totalEmotionLogs || data.stats?.totalSessions || 0,
        calmMoments: data.stats?.totalWins || data.stats?.calmMoments || 0,
        triggersEncountered: data.stats?.triggersEncountered || 0,
        breathingUsed: data.stats?.totalBreathingBreaks || data.stats?.breathingUsed || 0,
        journalsSaved: data.stats?.journalsSaved || 0,
      };
      setStats(mappedStats);
      
      // Map insights from backend (Gemini-generated)
      const mappedInsights: PatternInsight[] = [];
      
      // Add insights from Gemini
      if (data.insights && Array.isArray(data.insights)) {
        data.insights.forEach((insight: string | { text: string }) => {
          const text = typeof insight === 'string' ? insight : insight.text;
          mappedInsights.push({
            text,
            type: 'positive',
          });
        });
      }
      
      // Add suggestions from Gemini
      if (data.suggestions && Array.isArray(data.suggestions)) {
        data.suggestions.forEach((suggestion: string | { text: string }) => {
          const text = typeof suggestion === 'string' ? suggestion : suggestion.text;
          mappedInsights.push({
            text,
            type: 'suggestion',
          });
        });
      }
      
      // Add pattern insights if available
      if (data.patterns) {
        if (data.patterns.calmestTimeOfDay && data.patterns.calmestTimeOfDay !== 'unknown') {
          mappedInsights.push({
            text: `You tend to feel calmer in the ${data.patterns.calmestTimeOfDay}.`,
            type: 'positive',
          });
        }
      }
      
      if (mappedInsights.length === 0) {
        mappedInsights.push({
          text: 'Keep using Whisper Lite to build your insights.',
          type: 'neutral',
        });
      }
      
      setInsights(mappedInsights);
      setLoading(false);
      return;
    } catch (err) {
      console.error('Dashboard API error:', err);
      // Fall back to local data calculation
    }

    // Calculate from localStorage as fallback
    const sessions: Session[] = JSON.parse(localStorage.getItem('whisper-sessions') || '[]');
    const journals = JSON.parse(localStorage.getItem('whisper-journals') || '[]');
    
    // Filter to last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSessions = sessions.filter(s => new Date(s.startedAt) > weekAgo);

    const calculatedStats: WeeklyStats = {
      totalSessions: recentSessions.length,
      calmMoments: recentSessions.reduce((acc, s) => acc + (s.calmMinutes || 0), 0),
      triggersEncountered: recentSessions.filter(s => s.stressorDetected).length,
      breathingUsed: recentSessions.filter(s => s.interventionsUsed?.breatheUsed).length,
      journalsSaved: journals.length,
    };

    setStats(calculatedStats);

    // Generate basic insights from local data only (no hardcoded day-specific ones)
    const generatedInsights: PatternInsight[] = [];
    
    if (calculatedStats.totalSessions && calculatedStats.totalSessions > 0) {
      generatedInsights.push({
        text: `You've had ${calculatedStats.totalSessions} session${calculatedStats.totalSessions > 1 ? 's' : ''} this week.`,
        type: 'neutral',
      });
    }

    if (calculatedStats.calmMoments && calculatedStats.calmMoments > 0) {
      generatedInsights.push({
        text: `${calculatedStats.calmMoments} calm minutes recorded. That's great!`,
        type: 'positive',
      });
    }

    if (calculatedStats.breathingUsed && calculatedStats.breathingUsed > 0) {
      generatedInsights.push({
        text: `You used breathing exercises ${calculatedStats.breathingUsed} time${calculatedStats.breathingUsed > 1 ? 's' : ''}. Self-care matters.`,
        type: 'positive',
      });
    }

    if (generatedInsights.length === 0) {
      generatedInsights.push({
        text: 'Start a session to see your patterns here.',
        type: 'suggestion',
      });
    }

    setInsights(generatedInsights);
    setLoading(false);
  };

  const getInsightIcon = (type: PatternInsight['type']) => {
    switch (type) {
      case 'positive': return '✨';
      case 'suggestion': return '💡';
      default: return '📊';
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-8 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-medium text-[var(--text-primary)]">
          Your Week
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Patterns + progress (no judgment here)
        </p>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-[var(--bg-card)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-4 mb-6"
          >
            <StatCard
              label="Sessions"
              value={stats?.totalSessions || 0}
              icon="📱"
            />
            <StatCard
              label="Calm Minutes"
              value={stats?.calmMoments || 0}
              icon="🍃"
            />
            <StatCard
              label="Breathing Used"
              value={stats?.breathingUsed || 0}
              icon="🌬️"
            />
            <StatCard
              label="Journals Saved"
              value={stats?.journalsSaved || 0}
              icon="📓"
            />
          </motion.div>

          {/* Focus Moments */}
          {user && user.focusMoments > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6 p-4 bg-gradient-to-r from-[var(--color-calm-700)]/30 to-[var(--color-calm-600)]/30 rounded-xl border border-[var(--color-calm-600)]/30"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⭐</span>
                <div>
                  <p className="text-[var(--text-primary)] font-medium">
                    {user.focusMoments} Focus Moment{user.focusMoments > 1 ? 's' : ''}
                  </p>
                  <p className="text-[var(--text-muted)] text-sm">
                    Earned by using coping tools
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Insights */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-lg font-medium text-[var(--text-primary)] mb-3">
              Insights
            </h2>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className={`p-4 rounded-xl ${
                    insight.type === 'positive'
                      ? 'bg-[var(--color-calm-700)]/20 border border-[var(--color-calm-600)]/30'
                      : 'bg-[var(--bg-card)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getInsightIcon(insight.type)}</span>
                    <p className="text-[var(--text-primary)]">{insight.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Triggers Summary (non-judgmental) */}
          {stats && stats.triggersEncountered > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 p-4 bg-[var(--bg-card)] rounded-xl"
            >
              <h3 className="text-[var(--text-secondary)] text-sm mb-2">
                Moments that felt harder
              </h3>
              <p className="text-[var(--text-primary)]">
                {stats.triggersEncountered} time{stats.triggersEncountered > 1 ? 's' : ''} this week — and you got through {stats.triggersEncountered > 1 ? 'all of them' : 'it'}.
              </p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 bg-[var(--bg-card)] rounded-xl"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-[var(--text-muted)] text-sm">{label}</span>
      </div>
      <p className="text-3xl font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </motion.div>
  );
}
