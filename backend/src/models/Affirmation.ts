import mongoose, { Document, Schema } from 'mongoose';

export interface IAffirmation extends Document {
  userId: string;
  text: string; // "I can ask a question", "I belong here"
  audioUrl: string; // stored audio file path or URL
  triggers: string[]; // when to play: "before_raising_hand", "group_work_starts", "stress_detected"
  timesPlayed: number;
  isCustomVoice: boolean; // true = student recorded their own voice, false = ElevenLabs generated
  createdAt: Date;
  updatedAt: Date;
}

const AffirmationSchema = new Schema<IAffirmation>(
  {
    userId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    audioUrl: { type: String, required: true },
    triggers: {
      type: [String],
      required: true,
      enum: [
        'before_raising_hand',
        'group_work_starts',
        'stress_detected',
        'before_presentation',
        'post_class',
        'manual', // student manually plays it
      ],
    },
    timesPlayed: { type: Number, default: 0 },
    isCustomVoice: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Lookup affirmations by user + trigger type (used when context clues fire)
AffirmationSchema.index({ userId: 1, triggers: 1 });

export const Affirmation = mongoose.model<IAffirmation>('Affirmation', AffirmationSchema);

export default Affirmation;