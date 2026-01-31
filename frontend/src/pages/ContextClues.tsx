import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface ContextClue {
  _id: string;
  phrase: string;
  meaning: string;
  examples?: string[];
  category?: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'classroom', label: 'Classroom' },
  { id: 'social', label: 'Social' },
  { id: 'feedback', label: 'Feedback' },
];

export default function ContextClues() {
  const navigate = useNavigate();
  const [clues, setClues] = useState<ContextClue[]>([]);
  const [filteredClues, setFilteredClues] = useState<ContextClue[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expandedClue, setExpandedClue] = useState<string | null>(null);

  useEffect(() => {
    loadClues();
  }, []);

  useEffect(() => {
    filterClues();
  }, [clues, searchQuery, selectedCategory]);

  const loadClues = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/context-clues');
      if (response.ok) {
        const data = await response.json();
        setClues(data);
      } else {
        setClues(getDefaultClues());
      }
    } catch {
      setClues(getDefaultClues());
    }
    setLoading(false);
  };

  const filterClues = () => {
    let filtered = clues;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c => c.phrase.toLowerCase().includes(query) ||
             c.meaning.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    setFilteredClues(filtered);
  };

  const getDefaultClues = (): ContextClue[] => [
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
      phrase: "I'm disappointed",
      meaning: "They had expectations that weren't met - this is about the situation, not your worth",
      examples: ["After a test or assignment"],
      category: "feedback",
    },
  ];

  return (
    <div className="flex-1 flex flex-col px-6 py-8 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <button
          onClick={() => navigate(-1)}
          className="text-[var(--text-muted)] text-sm mb-4 hover:text-[var(--text-primary)] transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-medium text-[var(--text-primary)]">
          Context Clues
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          What phrases really mean
        </p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-4"
      >
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search phrases..."
            className="w-full px-4 py-3 pl-10 bg-[var(--bg-card)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-calm-500)]"
            aria-label="Search context clues"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </motion.div>

      {/* Category filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2 mb-6 overflow-x-auto pb-2"
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] ${
              selectedCategory === cat.id
                ? 'bg-[var(--color-calm-600)] text-white'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </motion.div>

      {/* Clues list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-[var(--bg-card)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredClues.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)]">
            {searchQuery ? 'No matches found' : 'No clues available'}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <AnimatePresence>
            {filteredClues.map((clue, index) => (
              <motion.div
                key={clue._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[var(--bg-card)] rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedClue(expandedClue === clue._id ? null : clue._id)}
                  className="w-full p-4 text-left"
                  aria-expanded={expandedClue === clue._id}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-[var(--text-primary)] font-medium">
                        "{clue.phrase}"
                      </p>
                      <p className="text-[var(--text-muted)] text-sm mt-1 line-clamp-2">
                        {clue.meaning}
                      </p>
                    </div>
                    <motion.svg
                      animate={{ rotate: expandedClue === clue._id ? 180 : 0 }}
                      className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0 ml-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </motion.svg>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedClue === clue._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0 border-t border-[var(--bg-secondary)]">
                        <p className="text-[var(--text-secondary)] mt-3">
                          {clue.meaning}
                        </p>
                        
                        {clue.examples && clue.examples.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
                              Example
                            </p>
                            {clue.examples.map((ex, i) => (
                              <p key={i} className="text-[var(--text-muted)] text-sm italic">
                                "{ex}"
                              </p>
                            ))}
                          </div>
                        )}

                        {clue.category && (
                          <span className="inline-block mt-3 px-2 py-1 bg-[var(--bg-secondary)] rounded text-xs text-[var(--text-muted)]">
                            {clue.category}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Help text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-[var(--text-muted)] text-xs mt-6"
      >
        These are common phrases that can be confusing. Remember: most people mean well!
      </motion.p>
    </div>
  );
}
