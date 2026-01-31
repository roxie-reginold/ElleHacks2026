import mongoose, { Document, Schema } from 'mongoose';

// --- Emotion Log (daily emoji check-ins) ---
export interface IEmotionLog extends Document {
  userId: string;
  sessionId?: string; // links to Session if triggered post-class
  timestamp: Date;
  emoji: string; // "😌", "😣", "😊", "😤", "😶"
  context?: string; // "group work", "science class", "lunch", "presentation"
  stressLevel?: number; // 1-10
  notes?: string; // optional student note
  createdAt: Date;
  updatedAt: Date;
}

const EmotionLogSchema = new Schema<IEmotionLog>(
  {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, index: true },
    timestamp: { type: Date, default: Date.now },
    emoji: {
      type: String,
      required: true,
      enum: ['😌', '😣', '😊', '😤', '😶', '😰', '🙂', '😬'],
    },
    context: { type: String },
    stressLevel: { type: Number, min: 1, max: 10 },
    notes: { type: String },
  },
  { timestamps: true }
);

// Efficient weekly dashboard queries: filter by user, sort by time
EmotionLogSchema.index({ userId: 1, timestamp: -1 });

export const EmotionLog = mongoose.model<IEmotionLog>('EmotionLog', EmotionLogSchema);


// --- Win (tracked achievements) ---
export interface IWin extends Document {
  userId: string;
  sessionId?: string;
  timestamp: Date;
  achievement: string; // "asked question in science", "stayed calm during group work"
  category: 'social' | 'academic' | 'emotional';
  weekNumber: number; // for easy weekly grouping
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const WinSchema = new Schema<IWin>(
  {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String },
    timestamp: { type: Date, default: Date.now },
    achievement: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['social', 'academic', 'emotional'],
    },
    weekNumber: { type: Number, required: true },
    year: { type: Number, required: true },
  },
  { timestamps: true }
);

// Weekly wins lookup
WinSchema.index({ userId: 1, weekNumber: 1, year: 1 });

export const Win = mongoose.model<IWin>('Win', WinSchema);


// --- Weekly Insight (generated summary for dashboard) ---
export interface IWeeklyInsight extends Document {
  userId: string;
  weekStart: Date; // Monday of that week
  weekEnd: Date; // Sunday of that week
  insights: string[]; // e.g. "You're calmer in the afternoon", "Group work feels harder"
  suggestions: string[]; // e.g. "Want a script for next time?"
  stats: {
    totalEmotionLogs: number;
    totalWins: number;
    totalBreathingBreaks: number;
    averageStressLevel: number;
    calmestTimeOfDay: string; // "morning", "afternoon", "evening"
    mostStressfulContext: string; // "group work", "presentations"
  };
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyInsightSchema = new Schema<IWeeklyInsight>(
  {
    userId: { type: String, required: true, index: true },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    insights: { type: [String], default: [] },
    suggestions: { type: [String], default: [] },
    stats: {
      totalEmotionLogs: { type: Number, default: 0 },
      totalWins: { type: Number, default: 0 },
      totalBreathingBreaks: { type: Number, default: 0 },
      averageStressLevel: { type: Number, default: 0 },
      calmestTimeOfDay: { type: String, default: 'unknown' },
      mostStressfulContext: { type: String, default: 'unknown' },
    },
  },
  { timestamps: true }
);

// One insight per user per week
WeeklyInsightSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

export const WeeklyInsight = mongoose.model<IWeeklyInsight>('WeeklyInsight', WeeklyInsightSchema);

export default { EmotionLog, Win, WeeklyInsight };