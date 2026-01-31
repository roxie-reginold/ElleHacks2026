import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { generateRecap, getRecapBySession, incrementFocusMoments, getAudioUrl, generateCalmingAudio } from '../services/api';

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
  const [error, setError] = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState(false);

  useEffect(() => {
    loadRecap();
  }, [readingLevel, sessionId, user?._id]);

  const loadRecap = async () => {
    setLoading(true);
    setError(null);
    
    // First, try to get existing recap from backend
    if (sessionId) {
      try {
        const existingRecap = await getRecapBySession(sessionId);
        if (existingRecap) {
          setRecap(existingRecap);
          setLoading(false);
          return;
        }
      } catch {
        // Continue to generate new recap
      }
    }
    
    // Get session from localStorage
    const sessions = JSON.parse(localStorage.getItem('whisper-sessions') || '[]');
    const session = sessions.find((s: Session) => s.id === sessionId);
    
    if (!session || !session.transcript) {
      // No session data - show helpful message instead of fake data
      setError("No session data found. Please record a class session first.");
      setLoading(false);
      return;
    }

    try {
      // Generate recap using Gemini via backend API
      const data = await generateRecap(
        user?._id || 'demo-user',
        sessionId || '',
        session.transcript,
        readingLevel
      );
      setRecap(data);
    } catch (err) {
      console.error('Failed to generate recap:', err);
      setError("Couldn't generate recap. Please check your connection and try again.");
    }
    
    setLoading(false);
  };

  // Generate audio for the recap using ElevenLabs TTS
  const handleGenerateAudio = async () => {
    if (!recap?.summaryText) return;
    
    setGeneratingAudio(true);
    try {
      const result = await generateCalmingAudio(recap.summaryText);
      if (result.success && result.audioPath) {
        // Update recap with audio URL
        const filename = result.audioPath.split('/').pop() || '';
        setRecap(prev => prev ? { ...prev, audioUrl: getAudioUrl(filename) } : prev);
      }
    } catch (err) {
      console.error('Failed to generate audio:', err);
    }
    setGeneratingAudio(false);
  };

  const handleSaveToJournal = async () => {
    const journals = JSON.parse(localStorage.getItem('whisper-journals') || '[]');
    journals.push({
      sessionId,
      recap: recap?.summaryText,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem('whisper-journals', JSON.stringify(journals));
    setSaved(true);
    
    // Award focus moment via backend API
    if (user?._id) {
      try {
        await incrementFocusMoments(user._id);
        // Also update local state
        updatePreferences({ focusMoments: (user.focusMoments || 0) + 1 });
      } catch (error) {
        console.error('Failed to increment focus moments:', error);
        // Still update locally as fallback
        updatePreferences({ focusMoments: (user.focusMoments || 0) + 1 });
      }
    }
  };

  const handlePlayAudio = () => {
    if (recap?.audioUrl) {
      // If it's a relative path from the backend, convert to full URL
      const audioUrl = recap.audioUrl.startsWith('http') 
        ? recap.audioUrl 
        : getAudioUrl(recap.audioUrl.replace(/^.*\//, ''));
      
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {
        // If audio playback fails, fallback to speech synthesis
        playWithSpeechSynthesis();
      });
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        // Fallback to speech synthesis
        playWithSpeechSynthesis();
      };
    } else {
      playWithSpeechSynthesis();
    }
  };

  const playWithSpeechSynthesis = () => {
    // Use speech synthesis as fallback
    const utterance = new SpeechSynthesisUtterance(recap?.summaryText || '');
    utterance.rate = 0.9;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
    setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
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
        ) : error ? (
          <div className="p-6 bg-[var(--bg-card)] rounded-xl">
            <p className="text-amber-400 mb-4">{error}</p>
            <button
              onClick={loadRecap}
              className="px-4 py-2 bg-[var(--color-calm-600)] text-white rounded-lg hover:bg-[var(--color-calm-500)] transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : recap ? (
          <div className="p-6 bg-[var(--bg-card)] rounded-xl">
            <p className="text-[var(--text-primary)] leading-relaxed text-lg">
              {recap.summaryText}
            </p>
            
            {/* Audio playback/generation buttons */}
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {recap.audioUrl ? (
                <button
                  onClick={handlePlayAudio}
                  disabled={isPlaying}
                  className="flex items-center gap-2 text-[var(--color-calm-400)] hover:text-[var(--color-calm-300)] transition-colors min-h-[44px]"
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
              ) : (
                <button
                  onClick={handleGenerateAudio}
                  disabled={generatingAudio}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-primary)] transition-colors min-h-[44px]"
                  aria-label="Generate audio recap"
                >
                  {generatingAudio ? (
                    <>
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Generating audio...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span>Generate audio</span>
                    </>
                  )}
                </button>
              )}
              
              {/* Fallback to speech synthesis */}
              {!recap.audioUrl && !generatingAudio && (
                <button
                  onClick={playWithSpeechSynthesis}
                  disabled={isPlaying}
                  className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors min-h-[44px]"
                  aria-label="Use browser speech"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                  </svg>
                  <span className="text-sm">Use browser voice</span>
                </button>
              )}
            </div>
          </div>
        ) : null}
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
