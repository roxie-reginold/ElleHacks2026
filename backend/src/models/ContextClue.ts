import mongoose, { Document, Schema } from 'mongoose';

export interface IContextClue extends Document {
  phrase: string;
  meaning: string;
  examples?: string[];
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContextClueSchema = new Schema<IContextClue>(
  {
    phrase: { type: String, required: true, unique: true },  // unique already creates index
    meaning: { type: String, required: true },
    examples: { type: [String], default: [] },
    category: { type: String, index: true },  // Index category for filtering
  },
  {
    timestamps: true,
  }
);

// Text index for search
ContextClueSchema.index({ phrase: 'text', meaning: 'text' });

export const ContextClue = mongoose.model<IContextClue>('ContextClue', ContextClueSchema);

// Seed default context clues
export const seedContextClues = async () => {
  // Only seed if MongoDB is connected (readyState 1 = connected)
  if (mongoose.connection.readyState !== 1) {
    console.log('ℹ️ Skipping context clues seeding (MongoDB not connected)');
    return;
  }

  const defaultClues: Partial<IContextClue>[] = [
    {
      phrase: "We'll talk later",
      meaning: "They may be busy right now, not mad at you",
      examples: ["Teacher says this when class is busy"],
      category: "classroom",
    },
    {
      phrase: "You're wrong",
      meaning: "Your answer wasn't correct, but that's okay - mistakes help us learn",
      examples: ["During class discussion"],
      category: "feedback",
    },
    {
      phrase: "See me after class",
      meaning: "The teacher wants to talk privately, it could be about anything - not necessarily bad",
      examples: ["Could be about extra help or a question you had"],
      category: "classroom",
    },
    {
      phrase: "That's interesting...",
      meaning: "They're thinking about what you said - this is usually neutral or positive",
      examples: ["Response to sharing an idea"],
      category: "social",
    },
    {
      phrase: "We need to talk",
      meaning: "Someone wants to have a conversation with you - try not to assume the worst",
      examples: ["Could be about plans, help, or just checking in"],
      category: "social",
    },
    {
      phrase: "Quiet down, everyone",
      meaning: "The whole class is being asked to be quieter - it's not directed at you specifically",
      examples: ["Class is getting loud"],
      category: "classroom",
    },
    {
      phrase: "Pay attention",
      meaning: "A reminder to focus - everyone gets distracted sometimes",
      examples: ["During a lesson"],
      category: "classroom",
    },
    {
      phrase: "That's not what I meant",
      meaning: "There was a misunderstanding - this happens and can be cleared up",
      examples: ["During a conversation"],
      category: "social",
    },
  ];

  try {
    for (const clue of defaultClues) {
      await ContextClue.findOneAndUpdate(
        { phrase: clue.phrase },
        clue,
        { upsert: true, new: true }
      );
    }
    console.log('✅ Context clues seeded');
  } catch (error) {
    console.warn('Could not seed context clues:', error);
  }
};

export default ContextClue;
