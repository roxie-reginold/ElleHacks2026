import mongoose, { Document, Schema } from 'mongoose';

export interface IDetectionEvent {
  t: number; // timestamp or segment index
  type: 'fast_speech' | 'laughter_spike' | 'harsh_tone' | 'sarcasm_likely' | 'crowd_noise' | 'urgent_tone' | 'frustrated_tone';
  confidence: number;
  note: string;
}

export interface IDetections {
  overallState: 'calm' | 'stressor_detected' | 'unknown';
  events: IDetectionEvent[];
}

export interface IInterventionsUsed {
  hapticSent: boolean;
  breatheUsed: boolean;
  journalUsed: boolean;
}

export interface IUserFeedback {
  feltStressful: 'yes' | 'no' | 'not_sure';
  notes?: string;
}

export interface ISession extends Document {
  userId: string;
  startedAt: Date;
  endedAt?: Date;
  durationSec?: number;
  transcript?: string;
  detections: IDetections;
  interventionsUsed: IInterventionsUsed;
  userFeedback?: IUserFeedback;
  calmMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

const DetectionEventSchema = new Schema<IDetectionEvent>({
  t: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['fast_speech', 'laughter_spike', 'harsh_tone', 'sarcasm_likely', 'crowd_noise', 'urgent_tone', 'frustrated_tone'],
    required: true 
  },
  confidence: { type: Number, min: 0, max: 1, required: true },
  note: { type: String, required: true },
});

const DetectionsSchema = new Schema<IDetections>({
  overallState: { 
    type: String, 
    enum: ['calm', 'stressor_detected', 'unknown'], 
    default: 'unknown' 
  },
  events: { type: [DetectionEventSchema], default: [] },
});

const InterventionsUsedSchema = new Schema<IInterventionsUsed>({
  hapticSent: { type: Boolean, default: false },
  breatheUsed: { type: Boolean, default: false },
  journalUsed: { type: Boolean, default: false },
});

const UserFeedbackSchema = new Schema<IUserFeedback>({
  feltStressful: { type: String, enum: ['yes', 'no', 'not_sure'] },
  notes: { type: String },
});

const SessionSchema = new Schema<ISession>(
  {
    userId: { type: String, required: true, index: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    durationSec: { type: Number },
    transcript: { type: String },
    detections: { type: DetectionsSchema, default: { overallState: 'unknown', events: [] } },
    interventionsUsed: { type: InterventionsUsedSchema, default: {} },
    userFeedback: { type: UserFeedbackSchema },
    calmMinutes: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Index for efficient weekly queries
SessionSchema.index({ userId: 1, startedAt: -1 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);

export default Session;
