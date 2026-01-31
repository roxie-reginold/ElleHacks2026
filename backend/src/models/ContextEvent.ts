/**
 * Context Event Model
 * 
 * Stores detected audio patterns from the Context Clues feature
 * for dashboard analysis and pattern tracking.
 */

import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export interface IContextEvent extends Document {
  userId: mongoose.Types.ObjectId | string;
  timestamp: Date;
  
  // Audio Analysis Data
  audioEvents: string[];       // ['Laughter', 'Fast_Speech', 'Multiple_Voices']
  transcript: string;          // What was said
  speakers: number;            // How many people were talking
  decibels?: number;           // Volume level (optional)
  
  // Gemini Analysis Results
  assessment: 'friendly' | 'neutral' | 'tense' | 'unknown';
  summary: string;             // Calming explanation
  triggers: string[];          // Detected anxiety triggers
  confidence: number;          // Analysis confidence (0-1)
  recommendations: string[];   // Suggested coping strategies
  
  // Session Info
  sessionId?: string;          // Group events by listening session
  duration?: number;           // Audio chunk duration in ms
  
  // User Interaction
  userFeedback?: 'helpful' | 'not_helpful' | 'incorrect';
  userNote?: string;           // Optional user annotation
}

// ============================================================================
// Schema
// ============================================================================

const ContextEventSchema = new Schema<IContextEvent>(
  {
    userId: {
      type: Schema.Types.Mixed,  // Can be ObjectId or string (for demo mode)
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    
    // Audio Analysis Data
    audioEvents: {
      type: [String],
      default: [],
      index: true,
    },
    transcript: {
      type: String,
      default: '',
    },
    speakers: {
      type: Number,
      default: 1,
      min: 0,
      max: 32,  // ElevenLabs Scribe v2 supports up to 32 speakers
    },
    decibels: {
      type: Number,
      min: 0,
      max: 200,
    },
    
    // Gemini Analysis Results
    assessment: {
      type: String,
      enum: ['friendly', 'neutral', 'tense', 'unknown'],
      default: 'neutral',
      index: true,
    },
    summary: {
      type: String,
      required: true,
    },
    triggers: {
      type: [String],
      default: [],
    },
    confidence: {
      type: Number,
      default: 0.5,
      min: 0,
      max: 1,
    },
    recommendations: {
      type: [String],
      default: [],
    },
    
    // Session Info
    sessionId: {
      type: String,
      index: true,
    },
    duration: {
      type: Number,  // milliseconds
    },
    
    // User Interaction
    userFeedback: {
      type: String,
      enum: ['helpful', 'not_helpful', 'incorrect'],
    },
    userNote: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,  // Adds createdAt and updatedAt
  }
);

// ============================================================================
// Indexes
// ============================================================================

// Compound index for efficient user + time queries (dashboard)
ContextEventSchema.index({ userId: 1, timestamp: -1 });

// Index for finding events by assessment type
ContextEventSchema.index({ userId: 1, assessment: 1 });

// Index for session-based queries
ContextEventSchema.index({ sessionId: 1, timestamp: 1 });

// Text index for searching transcripts
ContextEventSchema.index({ transcript: 'text', summary: 'text' });

// ============================================================================
// Static Methods
// ============================================================================

ContextEventSchema.statics.getRecentEvents = async function(
  userId: string,
  limit: number = 50
): Promise<IContextEvent[]> {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .exec();
};

ContextEventSchema.statics.getSessionEvents = async function(
  sessionId: string
): Promise<IContextEvent[]> {
  return this.find({ sessionId })
    .sort({ timestamp: 1 })
    .exec();
};

ContextEventSchema.statics.getAssessmentStats = async function(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ friendly: number; neutral: number; tense: number }> {
  const query: any = { userId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  
  const results = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$assessment',
        count: { $sum: 1 },
      },
    },
  ]);
  
  const stats = { friendly: 0, neutral: 0, tense: 0 };
  for (const result of results) {
    if (result._id in stats) {
      stats[result._id as keyof typeof stats] = result.count;
    }
  }
  
  return stats;
};

ContextEventSchema.statics.getCommonTriggers = async function(
  userId: string,
  limit: number = 10
): Promise<{ trigger: string; count: number }[]> {
  const results = await this.aggregate([
    { $match: { userId, triggers: { $ne: [] } } },
    { $unwind: '$triggers' },
    {
      $group: {
        _id: '$triggers',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        trigger: '$_id',
        count: 1,
        _id: 0,
      },
    },
  ]);
  
  return results;
};

ContextEventSchema.statics.getAudioEventFrequency = async function(
  userId: string,
  days: number = 7
): Promise<{ event: string; count: number }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const results = await this.aggregate([
    {
      $match: {
        userId,
        timestamp: { $gte: startDate },
        audioEvents: { $ne: [] },
      },
    },
    { $unwind: '$audioEvents' },
    {
      $group: {
        _id: '$audioEvents',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        event: '$_id',
        count: 1,
        _id: 0,
      },
    },
  ]);
  
  return results;
};

// ============================================================================
// Model
// ============================================================================

const ContextEvent = mongoose.model<IContextEvent>('ContextEvent', ContextEventSchema);

export default ContextEvent;
