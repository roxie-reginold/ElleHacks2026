import mongoose, { Document, Schema } from 'mongoose';

export interface IKeyTerm {
  term: string;
  explanation: string;
}

export interface IRecap extends Document {
  sessionId: string;
  userId: string;
  readingLevelGrade: number;
  summaryText: string;
  keyTerms: IKeyTerm[];
  audioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KeyTermSchema = new Schema<IKeyTerm>({
  term: { type: String, required: true },
  explanation: { type: String, required: true },
});

const RecapSchema = new Schema<IRecap>(
  {
    sessionId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    readingLevelGrade: { type: Number, min: 6, max: 10, required: true },
    summaryText: { type: String, required: true },
    keyTerms: { type: [KeyTermSchema], default: [] },
    audioUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Recap = mongoose.model<IRecap>('Recap', RecapSchema);

export default Recap;
