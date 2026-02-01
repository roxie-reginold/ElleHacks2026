import mongoose, { Document, Schema } from 'mongoose';

export interface ITrustedAdult {
  name: string;
  channel: 'sms' | 'email' | 'push';
  address: string;
}

export interface IUser extends Document {
  displayName: string;
  ageRange: '13-15' | '16-19';
  pronouns?: string;
  readingLevelGrade: number;
  sensitivity: 'low' | 'med' | 'high';
  trustedAdult?: ITrustedAdult;
  focusMoments: number;
  journalPrompts: string[];
  role?: 'student' | 'teacher';
  createdAt: Date;
  updatedAt: Date;
}

const TrustedAdultSchema = new Schema<ITrustedAdult>({
  name: { type: String, required: true },
  channel: { type: String, enum: ['sms', 'email', 'push'], required: true },
  address: { type: String, required: true },
});

const UserSchema = new Schema<IUser>(
  {
    displayName: { type: String, default: 'Friend' },
    ageRange: { type: String, enum: ['13-15', '16-19'], default: '13-15' },
    pronouns: { type: String },
    readingLevelGrade: { type: Number, min: 6, max: 10, default: 7 },
    sensitivity: { type: String, enum: ['low', 'med', 'high'], default: 'med' },
    trustedAdult: { type: TrustedAdultSchema },
    focusMoments: { type: Number, default: 0 },
    journalPrompts: { type: [String], default: [] },
    role: { type: String, enum: ['student', 'teacher'] },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);

export default User;
