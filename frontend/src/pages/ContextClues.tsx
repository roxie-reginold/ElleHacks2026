import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useContextListener } from '../hooks/useContextListener';
import { useUser } from '../context/UserContext';
import { getContextClues as fetchContextClues } from '../services/api';

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

const TABS = [
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'listen', label: 'Live Listen', icon: '🎧' },
];

export default function ContextClues() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'library' | 'listen'>('library');

  // Library state
  const [clues, setClues] = useState<ContextClue[]>([]);
  const [filteredClues, setFilteredClues] = useState<ContextClue[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expandedClue, setExpandedClue] = useState<string | null>(null);

  // Context listener hook - using streaming mode for ~150ms latency
  const {
    isConnected,
    isStreaming,
    isListening,
    mode,
    currentContext,
    recentEvents,
    liveTranscript,
    calmingAudio,
    status,
    error,
    audioLevel,
    startListening,
    stopListening,
    connect,
    clearError,
    setMode,
  } = useContextListener({
    userId: user?._id || 'demo-user',
    autoConnect: false,
    mode: 'streaming',  // Use streaming for ~150ms latency
  });

  // Audio ref for calming audio playback
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadClues();
  }, []);

  // Debug: Log transcript changes
  useEffect(() => {
    if (liveTranscript) {
      console.log(`🖥️ UI displaying transcript: "${liveTranscript}"`);
    }
  }, [liveTranscript]);

  useEffect(() => {
    filterClues();
  }, [clues, searchQuery, selectedCategory]);

  // Auto-play calming audio when available
  useEffect(() => {
    if (calmingAudio && audioRef.current) {
      audioRef.current.src = calmingAudio.audioUrl;
      audioRef.current.play().catch(console.warn);
    }
  }, [calmingAudio]);

  const loadClues = async () => {
    setLoading(true);
    try {
      const data = await fetchContextClues();
      setClues(data as ContextClue[]);
    } catch (err) {
      console.error('Failed to load context clues:', err);
      // Backend returns default clues even when DB fails, so empty array means actual error
      setClues([]);
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

  const handleToggleListening = async () => {
    if (isListening) {
      stopListening();
    } else {
      if (!isConnected) {
        connect();
        // Wait a moment for connection
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      await startListening();
    }
  };

  const getAssessmentColor = (assessment: string) => {
    switch (assessment) {
      case 'friendly': return 'text-green-500';
      case 'neutral': return 'text-yellow-500';
      case 'tense': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getAssessmentEmoji = (assessment: string) => {
    switch (assessment) {
      case 'friendly': return '😊';
      case 'neutral': return '😐';
      case 'tense': return '😟';
      default: return '❓';
    }
  };


  return (
    <div className="flex-1 flex flex-col px-6 py-8 pb-24">
      {/* Hidden audio element for calming prompts */}
      <audio ref={audioRef} className="hidden" />

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
          {activeTab === 'library'
            ? 'What phrases really mean'
            : 'Real-time environment understanding'}
        </p>
      </motion.div>

      {/* Tab Switcher */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 mb-6 p-1 bg-[var(--bg-card)] rounded-xl"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'library' | 'listen')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all min-h-[44px] ${activeTab === tab.id
                ? 'bg-[var(--color-calm-600)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between"
          >
            <span className="text-red-500 text-sm">{error}</span>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-400 text-sm"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Library Tab */}
      {activeTab === 'library' && (
        <>
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
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] ${selectedCategory === cat.id
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
        </>
      )}

      {/* Live Listen Tab */}
      {activeTab === 'listen' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col flex-1"
        >
          {/* Connection Status + Mode Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-[var(--text-muted)]">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {isStreaming && (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-500 rounded text-xs font-medium">
                  LIVE
                </span>
              )}
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setMode('streaming')}
                className={`px-2 py-1 rounded ${mode === 'streaming'
                    ? 'bg-[var(--color-calm-600)] text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
                  }`}
              >
                Instant
              </button>
              <button
                onClick={() => setMode('chunked')}
                className={`px-2 py-1 rounded ${mode === 'chunked'
                    ? 'bg-[var(--color-calm-600)] text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
                  }`}
              >
                Detailed
              </button>
            </div>
          </div>

          {/* Main Listen Button */}
          <motion.button
            onClick={handleToggleListening}
            whileTap={{ scale: 0.95 }}
            className={`relative mx-auto w-32 h-32 rounded-full flex items-center justify-center transition-all ${isListening
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-[var(--color-calm-600)] hover:bg-[var(--color-calm-700)]'
              }`}
          >
            {/* Audio level indicator ring */}
            {isListening && (
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-white/30"
                animate={{ scale: 1 + audioLevel * 0.3 }}
                transition={{ duration: 0.1 }}
              />
            )}

            {/* Pulsing ring when streaming */}
            {isStreaming && mode === 'streaming' && (
              <motion.div
                className="absolute inset-[-8px] rounded-full border-2 border-red-400"
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}

            <span className="text-white text-4xl">
              {isListening ? '⏹' : '🎧'}
            </span>
          </motion.button>

          <p className="text-center text-[var(--text-muted)] mt-4 text-sm">
            {isListening
              ? mode === 'streaming'
                ? 'Streaming live (~150ms latency)'
                : 'Listening to your environment...'
              : 'Tap to start listening'}
          </p>

          {/* Status */}
          {status && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[var(--text-muted)] text-sm mt-2"
            >
              {status.message}
            </motion.div>
          )}

          {/* Live Transcript Panel - Shows words as they're spoken */}
          {isStreaming && liveTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-[var(--bg-card)] rounded-xl border-l-4 border-[var(--color-calm-500)]"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                  Live Transcript
                </span>
              </div>
              <p className="text-[var(--text-primary)] text-sm leading-relaxed">
                {liveTranscript}
                <span className="animate-pulse">|</span>
              </p>
            </motion.div>
          )}

          {/* Current Context Card */}
          {currentContext && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-[var(--bg-card)] rounded-xl"
            >
              {/* Assessment Header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{getAssessmentEmoji(currentContext.assessment)}</span>
                <div>
                  <p className={`font-medium capitalize ${getAssessmentColor(currentContext.assessment)}`}>
                    {currentContext.assessment} Environment
                  </p>
                  <p className="text-[var(--text-muted)] text-xs">
                    {currentContext.speakers} speaker{currentContext.speakers !== 1 ? 's' : ''} detected
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[var(--text-muted)] text-xs">
                    Confidence
                  </p>
                  <p className="text-[var(--text-primary)] font-medium">
                    {Math.round(currentContext.confidence * 100)}%
                  </p>
                </div>
              </div>

              {/* Summary */}
              <p className="text-[var(--text-primary)] mb-3">
                {currentContext.summary}
              </p>

              {/* Audio Events */}
              {currentContext.audioEvents.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {currentContext.audioEvents.map((event, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-[var(--bg-secondary)] rounded-full text-xs text-[var(--text-muted)]"
                    >
                      {event}
                    </span>
                  ))}
                </div>
              )}

              {/* Transcript (collapsed) */}
              {currentContext.transcript && (
                <details className="mt-2">
                  <summary className="text-[var(--text-muted)] text-xs cursor-pointer">
                    View transcript
                  </summary>
                  <p className="text-[var(--text-muted)] text-sm mt-2 italic">
                    "{currentContext.transcript}"
                  </p>
                </details>
              )}

              {/* Recommendations */}
              {currentContext.recommendations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--bg-secondary)]">
                  <p className="text-xs text-[var(--text-muted)] mb-2">Suggestions:</p>
                  <ul className="space-y-1">
                    {currentContext.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                        <span className="text-[var(--color-calm-500)]">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          {/* Recent Events Feed - Instant Detection (~150ms) */}
          {recentEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-[var(--text-muted)]">
                  Instant Detections
                </h3>
                {mode === 'streaming' && (
                  <span className="px-1.5 py-0.5 bg-green-500/20 text-green-500 rounded text-[10px] font-medium">
                    ~150ms
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {recentEvents.slice(0, 5).map((event, i) => (
                  <motion.div
                    key={event.timestamp}
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 500 }}
                    className="p-3 bg-[var(--bg-card)] rounded-lg border-l-2 border-[var(--color-calm-500)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[var(--color-calm-500)]/20 text-[var(--color-calm-600)] rounded text-xs font-medium">
                        {event.event}
                      </span>
                      {event.confidence && (
                        <span className="text-[var(--text-muted)] text-[10px]">
                          {Math.round(event.confidence * 100)}%
                        </span>
                      )}
                      <span className="text-[var(--text-muted)] text-xs ml-auto">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                      {event.interpretation}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Calming Audio Player */}
          {calmingAudio && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-[var(--color-calm-500)]/10 border border-[var(--color-calm-500)]/20 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔊</span>
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-primary)]">
                    Calming message available
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {calmingAudio.summary.slice(0, 50)}...
                  </p>
                </div>
                <button
                  onClick={() => audioRef.current?.play()}
                  className="px-3 py-1 bg-[var(--color-calm-600)] text-white rounded-full text-sm"
                >
                  Play
                </button>
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {!isListening && !currentContext && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center text-center px-8 mt-8"
            >
              <div className="text-6xl mb-4">👂</div>
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                Real-time Context Understanding
              </h3>
              <p className="text-[var(--text-muted)] text-sm">
                Start listening to get real-time explanations of what's happening
                around you. We'll help you understand tones, laughter, and classroom sounds.
              </p>
              <div className="mt-6 space-y-2 text-left w-full max-w-xs">
                <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                  <span className="text-green-500">✓</span>
                  Detects laughter and explains it
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                  <span className="text-green-500">✓</span>
                  Identifies speaker tones
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                  <span className="text-green-500">✓</span>
                  Provides calming explanations
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
