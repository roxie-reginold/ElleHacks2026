import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';

interface RecapData {
  summaryText: string;
  keyTerms: { term: string; explanation: string }[];
  audioUrl?: string;
}

interface Session {
  id: string;
  transcript: string;
  startedAt: string;
  endedAt: string;
}

export default function Recap() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, updatePreferences } = useUser();
  
  const [readingLevel, setReadingLevel] = useState(user?.readingLevelGrade || 7);
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    generateRecap();
  }, [readingLevel]);

  const generateRecap = async () => {
    setLoading(true);
    
    // Get session from localStorage
    const sessions = JSON.parse(localStorage.getItem('whisper-sessions') || '[]');
    const session = sessions.find((s: Session) => s.id === sessionId);
    
    if (!session) {
      // Use mock data for demo
      setRecap({
        summaryText: getDefaultRecap(readingLevel),
        keyTerms: [
          { term: 'Photosynthesis', explanation: 'How plants make food from sunlight' },
          { term: 'Chlorophyll', explanation: 'The green stuff in leaves that catches light' },
        ],
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?._id,
          sessionId,
          transcript: session.transcript,
          readingLevelGrade: readingLevel,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecap(data);
      } else {
        throw new Error('Failed to generate recap');
      }
    } catch {
      // Fallback to mock recap
      setRecap({
        summaryText: getDefaultRecap(readingLevel),
        keyTerms: [
          { term: 'Photosynthesis', explanation: 'How plants make food from sunlight' },
          { term: 'Chlorophyll', explanation: 'The green stuff in leaves that catches light' },
        ],
      });
    }
    
    setLoading(false);
  };

  const getDefaultRecap = (level: number): string => {
    if (level <= 6) {
      return "Today you learned about plants. Plants are amazing! They eat sunlight to make food. This is called photosynthesis. You did a great job listening today. Proud of you!";
    } else if (level <= 8) {
      return "Today's class was about photosynthesis. Plants use sunlight, water, and carbon dioxide to make their own food. They also make oxygen, which we breathe. You followed along well today. Keep it up!";
    } else {
      return "Today's lesson covered photosynthesis in detail. Plants convert light energy into chemical energy through chlorophyll in their leaves. This process produces glucose for energy and releases oxygen as a byproduct. You engaged well with the material today.";
    }
  };

  const handleSaveToJournal = () => {
    const journals = JSON.parse(localStorage.getItem('whisper-journals') || '[]');
    journals.push({
      sessionId,
      recap: recap?.summaryText,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem('whisper-journals', JSON.stringify(journals));
    setSaved(true);
    
    // Award focus moment
    if (user) {
      updatePreferences({ focusMoments: (user.focusMoments || 0) + 1 });
    }
  };

  const handlePlayAudio = () => {
    if (recap?.audioUrl) {
      const audio = new Audio(recap.audioUrl);
      audio.play();
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
    } else {
      // Use speech synthesis as fallback
      const utterance = new SpeechSynthesisUtterance(recap?.summaryText || '');
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
      setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
    }
  };

  const handleReadingLevelChange = (newLevel: number) => {
    setReadingLevel(newLevel);
    if (user) {
      updatePreferences({ readingLevelGrade: newLevel });
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-8 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <button
          onClick={() => navigate('/')}
          className="text-[var(--text-muted)] text-sm mb-4 hover:text-[var(--text-primary)] transition-colors"
        >
          ← Home
        </button>
        <h1 className="text-2xl font-medium text-[var(--text-primary)]">
          You were here today
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Here's what happened in class
        </p>
      </motion.div>

      {/* Reading Level Slider */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 p-4 bg-[var(--bg-card)]/50 rounded-xl"
      >
        <label className="text-sm text-[var(--text-secondary)] mb-2 block">
          Reading Level: Grade {readingLevel}
        </label>
        <input
          type="range"
          min="6"
          max="10"
          value={readingLevel}
          onChange={(e) => handleReadingLevelChange(Number(e.target.value))}
          className="w-full h-2 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-calm-500)]"
          aria-label="Adjust reading level"
        />
        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
          <span>Simpler</span>
          <span>More detail</span>
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        {loading ? (
          <div className="p-6 bg-[var(--bg-card)] rounded-xl">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4"></div>
              <div className="h-4 bg-[var(--bg-secondary)] rounded w-full"></div>
              <div className="h-4 bg-[var(--bg-secondary)] rounded w-5/6"></div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-[var(--bg-card)] rounded-xl">
            <p className="text-[var(--text-primary)] leading-relaxed text-lg">
              {recap?.summaryText}
            </p>
            
            {/* Audio playback button */}
            <button
              onClick={handlePlayAudio}
              disabled={isPlaying}
              className="mt-4 flex items-center gap-2 text-[var(--color-calm-400)] hover:text-[var(--color-calm-300)] transition-colors min-h-[44px]"
              aria-label={isPlaying ? 'Playing audio' : 'Play audio recap'}
            >
              {isPlaying ? (
                <>
                  <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Playing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                  </svg>
                  <span>Listen to recap</span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>

      {/* Key Terms */}
      {recap?.keyTerms && recap.keyTerms.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-3">
            Key Words
          </h2>
          <div className="space-y-2">
            {recap.keyTerms.map((item, index) => (
              <div
                key={index}
                className="p-4 bg-[var(--bg-card)]/50 rounded-xl"
              >
                <span className="font-medium text-[var(--color-calm-300)]">
                  {item.term}
                </span>
                <span className="text-[var(--text-muted)]"> — {item.explanation}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-3 mt-auto"
      >
        <button
          onClick={handleSaveToJournal}
          disabled={saved}
          className={`w-full py-4 rounded-xl font-medium transition-colors min-h-[44px] ${
            saved
              ? 'bg-[var(--color-calm-700)] text-[var(--color-calm-300)]'
              : 'bg-[var(--color-calm-600)] text-white hover:bg-[var(--color-calm-500)]'
          }`}
        >
          {saved ? '✓ Saved to Journal' : 'Save to Journal'}
        </button>
        
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-4 rounded-xl font-medium bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors min-h-[44px]"
        >
          View Dashboard
        </button>
      </motion.div>
    </div>
  );
}
