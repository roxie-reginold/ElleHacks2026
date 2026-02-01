import { Router, Request, Response } from 'express';
import ContextClue from '../models/ContextClue';

const router = Router();

// Note: Seeding is now done in index.ts after MongoDB connects

/**
 * GET /api/context-clues
 * Get all context clues or search
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { q, category } = req.query;

    let query: any = {};

    if (q) {
      // Text search
      query.$text = { $search: q as string };
    }

    if (category) {
      query.category = category;
    }

    const clues = await ContextClue.find(query).limit(50);

    // If no results from DB, return default clues
    if (clues.length === 0 && !q) {
      res.json(getDefaultClues());
      return;
    }

    res.json(clues);
  } catch (error) {
    console.error('Context clues fetch error:', error);
    // Return defaults on error
    res.json(getDefaultClues());
  }
});

/**
 * GET /api/context-clues/search
 * Search clues by phrase or meaning
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const searchTerm = (q as string).toLowerCase();

    // Search in both phrase and meaning
    const clues = await ContextClue.find({
      $or: [
        { phrase: { $regex: searchTerm, $options: 'i' } },
        { meaning: { $regex: searchTerm, $options: 'i' } },
      ],
    }).limit(20);

    // If no DB results, search defaults
    if (clues.length === 0) {
      const defaults = getDefaultClues().filter(
        c => c.phrase.toLowerCase().includes(searchTerm) ||
             c.meaning.toLowerCase().includes(searchTerm)
      );
      res.json(defaults);
      return;
    }

    res.json(clues);
  } catch (error) {
    console.error('Context clues search error:', error);
    res.json([]);
  }
});

/**
 * GET /api/context-clues/:id
 * Get a single context clue
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clue = await ContextClue.findById(id);

    if (!clue) {
      res.status(404).json({ error: 'Context clue not found' });
      return;
    }

    res.json(clue);
  } catch (error) {
    console.error('Context clue fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch context clue' });
  }
});

/**
 * POST /api/context-clues
 * Add a new context clue (admin/future feature)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { phrase, meaning, examples, category } = req.body;

    if (!phrase || !meaning) {
      res.status(400).json({ error: 'Phrase and meaning are required' });
      return;
    }

    const clue = new ContextClue({
      phrase,
      meaning,
      examples: examples || [],
      category,
    });

    await clue.save();
    res.status(201).json(clue);
  } catch (error) {
    console.error('Context clue create error:', error);
    res.status(500).json({ error: 'Failed to create context clue' });
  }
});

// Default clues for when DB is unavailable
function getDefaultClues() {
  return [
    {
      _id: 'default-1',
      phrase: "We'll talk later",
      meaning: "They may be busy right now, not mad at you",
      examples: ["Teacher says this when class is busy"],
      category: "classroom",
    },
    {
      _id: 'default-2',
      phrase: "You're wrong",
      meaning: "Your answer wasn't correct, but that's okay - mistakes help us learn",
      examples: ["During class discussion"],
      category: "feedback",
    },
    {
      _id: 'default-3',
      phrase: "See me after class",
      meaning: "The teacher wants to talk privately, it could be about anything - not necessarily bad",
      examples: ["Could be about extra help or a question you had"],
      category: "classroom",
    },
    {
      _id: 'default-4',
      phrase: "That's interesting...",
      meaning: "They're thinking about what you said - this is usually neutral or positive",
      examples: ["Response to sharing an idea"],
      category: "social",
    },
    {
      _id: 'default-5',
      phrase: "We need to talk",
      meaning: "Someone wants to have a conversation with you - try not to assume the worst",
      examples: ["Could be about plans, help, or just checking in"],
      category: "social",
    },
    {
      _id: 'default-6',
      phrase: "Quiet down, everyone",
      meaning: "The whole class is being asked to be quieter - it's not directed at you specifically",
      examples: ["Class is getting loud"],
      category: "classroom",
    },
    {
      _id: 'default-7',
      phrase: "Pay attention",
      meaning: "A reminder to focus - everyone gets distracted sometimes",
      examples: ["During a lesson"],
      category: "classroom",
    },
    {
      _id: 'default-8',
      phrase: "That's not what I meant",
      meaning: "There was a misunderstanding - this happens and can be cleared up",
      examples: ["During a conversation"],
      category: "social",
    },
    {
      _id: 'default-9',
      phrase: "Whatever",
      meaning: "They might be frustrated or done with the topic - it's usually not about you",
      examples: ["End of an argument"],
      category: "social",
    },
    {
      _id: 'default-10',
      phrase: "I'm disappointed",
      meaning: "They had expectations that weren't met - this is about the situation, not your worth",
      examples: ["After a test or assignment"],
      category: "feedback",
    },
  ];
}

export default router;
