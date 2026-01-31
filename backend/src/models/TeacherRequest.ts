import mongoose, { Document, Schema } from 'mongoose';

export interface ITeacherRequest extends Document {
  studentId: string;
  teacherId?: string; // optional — assigned if teacher is linked
  timestamp: Date;
  requestType: 'need_help' | 'confused' | 'slow_down';
  classSession?: string; // e.g. "Math - Period 3"
  resolved: boolean;
  resolvedAt?: Date;
  teacherNote?: string; // teacher can optionally reply
  createdAt: Date;
  updatedAt: Date;
}

const TeacherRequestSchema = new Schema<ITeacherRequest>(
  {
    studentId: { type: String, required: true, index: true },
    teacherId: { type: String, index: true },
    timestamp: { type: Date, default: Date.now },
    requestType: {
      type: String,
      required: true,
      enum: ['need_help', 'confused', 'slow_down'],
    },
    classSession: { type: String },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    teacherNote: { type: String },
  },
  { timestamps: true }
);

// Teacher dashboard: show unresolved requests quickly
TeacherRequestSchema.index({ teacherId: 1, resolved: 1, timestamp: -1 });

// Student history: see past requests
TeacherRequestSchema.index({ studentId: 1, timestamp: -1 });

export const TeacherRequest = mongoose.model<ITeacherRequest>('TeacherRequest', TeacherRequestSchema);

export default TeacherRequest;