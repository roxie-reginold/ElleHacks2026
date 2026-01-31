import mongoose, { Document, Schema } from 'mongoose';

export type HelpRequestType = 'help' | 'confused' | 'slower';

export interface IHelpRequest extends Document {
  type: HelpRequestType;
  studentId: string;
  classSessionId: string;
  courseId?: string;
  teacherId?: string;
  createdAt: Date;
  updatedAt: Date;
  timestamp: Date;
  seenAt?: Date;
  resolved: boolean;
  anonymous: boolean;
}

const HelpRequestSchema = new Schema<IHelpRequest>(
  {
    type: { type: String, enum: ['help', 'confused', 'slower'], required: true },
    studentId: { type: String, required: true },
    classSessionId: { type: String, required: true },
    courseId: { type: String },
    teacherId: { type: String },
    timestamp: { type: Date, default: () => new Date() },
    seenAt: { type: Date },
    resolved: { type: Boolean, default: false },
    anonymous: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Indexes to match your MongoDB usage (teacherId, resolved, timestamp, studentId)
HelpRequestSchema.index({ classSessionId: 1, createdAt: -1 });
HelpRequestSchema.index({ studentId: 1, createdAt: -1 });
HelpRequestSchema.index({ studentId: 1 });
HelpRequestSchema.index({ teacherId: 1 });
HelpRequestSchema.index({ teacherId: 1, resolved: 1, timestamp: -1 });
HelpRequestSchema.index({ studentId: 1, timestamp: -1 });

export default mongoose.model<IHelpRequest>('HelpRequest', HelpRequestSchema);
