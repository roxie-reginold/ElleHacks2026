import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { useHaptics } from '../hooks/useHaptics';
import AudioRecorder from '../components/AudioRecorder/AudioRecorder';
import { BreathingExercise } from '../components/BreathingExercise/BreathingExercise';
import { analyzeAudio, logEmotion, incrementFocusMoments } from '../services/api';

type UIState = 'green' | 'amber';
type SessionState = 'idle' | 'recording' | 'analyzing' | 'active' | 'stressor';

interface Detection {
  type: string;
  confidence: number;
  note: string;
}

interface AnalysisResult {
  detections: {
    overallState: 'calm' | 'stressor_detected' | 'unknown';
    events: Detection[];
  };
  suggestedPrompt: string;
  uiState: UIState;
  transcript?: string;
}

const CALMING_PROMPTS = [
  "You're safe. This isn't about you.",
  "Breathe with me. In… out…",
  "It's okay to pause. You're doing your best.",
  "Confusing moments happen. You're not in trouble.",
  "Take your time. There's no rush.",
];

export default function ActiveListening() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { triggerHaptic } = useHaptics();
  
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [uiState, setUiState] = useState<UIState>('green');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [showBreathing, setShowBreathing] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [_analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Generate session ID on mount
  useEffect(() => {
    setSessionId(`session-${Date.now()}`);
  }, []);

  const handleAudioSubmit = async (audioBlob: Blob | null, audioFile: File | null) => {
    setSessionState('analyzing');
    
    try {
      const userId = user?._id || 'demo-user';
      const result = await analyzeAudio(userId, audioBlob, audioFile);
      
      setAnalysisResult(result as AnalysisResult);
      setTranscript(result.transcript || '');
      
      // Update UI based on analysis
      setUiState(result.uiState);
      
      if (result.uiState === 'amber') {
        setSessionState('stressor');
        setCurrentPrompt(result.suggestedPrompt || CALMING_PROMPTS[Math.floor(Math.random() * CALMING_PROMPTS.length)]);
        triggerHaptic('gentle');
        
        // Log stress detection
        await logEmotion(userId, '😰', {
          context: 'stressor_detected',
          stressLevel: 3,
          sessionId,
        }).catch(console.error);
        
        // Show check-in after a moment
        setTimeout(() => setShowCheckIn(true), 3000);
      } else {
        setSessionState('active');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      // Show error state and allow retry - don't use mock data
      setSessionState('idle');
      setCurrentPrompt("We couldn't analyze the audio right now. Please try again.");
    }
  };

  const handleEndSession = useCallback(() => {
    // Save session data
    const sessions = JSON.parse(localStorage.getItem('whisper-sessions') || '[]');
    const newSession = {
      id: sessionId,
      startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      transcript,
      uiState,
      calmMinutes: uiState === 'green' ? 5 : 3,
      stressorDetected: uiState === 'amber',
      interventionsUsed: {
        hapticSent: uiState === 'amber',
        breatheUsed: showBreathing,
      },
    };
    sessions.push(newSession);
    localStorage.setItem('whisper-sessions', JSON.stringify(sessions));
    
    // Navigate to recap
    navigate(`/recap/${sessionId}`);
  }, [sessionId, transcript, uiState, showBreathing, navigate]);

  const handleCheckInResponse = async (response: 'yes' | 'no' | 'not_now') => {
    setShowCheckIn(false);
    const userId = user?._id || 'demo-user';
    
    if (response === 'yes') {
      setShowBreathing(true);
      
      // Increment focus moments for using coping tool
      try {
        await incrementFocusMoments(userId);
      } catch (error) {
        console.error('Failed to increment focus moments:', error);
      }
      
      // Log positive coping action
      await logEmotion(userId, '🌬️', {
        context: 'breathing_exercise',
        sessionId,
        notes: 'User chose to do breathing exercise',
      }).catch(console.error);
    }
    
    // Log feedback for learning
    console.log('User feedback:', response);
  };

  const bgColorClass = uiState === 'amber' 
    ? 'bg-gradient-to-b from-amber-900/30 to-[var(--bg-primary)]' 
    : 'bg-gradient-to-b from-[var(--bg-primary)] to-[var(--bg-secondary)]';

  return (
    <div className={`flex-1 flex flex-col ${bgColorClass} transition-colors duration-1000`}>
      {/* Header - minimal */}
      <div className="p-4 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)] transition-colors min-w-[44px] min-h-[44px] flex items-center"
          aria-label="Go back home"
        >
          ← Back
        </button>
        
        {sessionState !== 'idle' && (
          <button
            onClick={handleEndSession}
            className="text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)] transition-colors px-4 py-2 rounded-lg bg-[var(--bg-card)]/30 min-h-[44px]"
          >
            End Session
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {sessionState === 'idle' && (
            <motion.div
              key="recorder"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <h2 className="text-xl text-center text-[var(--text-primary)] mb-6">
                Ready to listen
              </h2>
              <AudioRecorder onSubmit={handleAudioSubmit} />
            </motion.div>
          )}

          {sessionState === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <motion.div
                className="w-24 h-24 rounded-full border-4 border-[var(--color-calm-400)] border-t-transparent mx-auto mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-[var(--text-secondary)]">Analyzing audio...</p>
            </motion.div>
          )}

          {(sessionState === 'active' || sessionState === 'stressor') && (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center w-full max-w-md"
            >
              {/* Subtle waveform indicator */}
              <div className="flex items-center justify-center gap-1 mb-8">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-1 rounded-full ${uiState === 'amber' ? 'bg-amber-400' : 'bg-[var(--color-calm-400)]'}`}
                    animate={{
                      height: [12, 24, 12],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </div>

              {/* Status indicator */}
              <motion.div
                className={`w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center ${
                  uiState === 'amber' 
                    ? 'bg-amber-500/20 border-2 border-amber-400/50' 
                    : 'bg-[var(--color-calm-600)]/20 border-2 border-[var(--color-calm-400)]/50'
                }`}
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                onClick={() => setShowBreathing(true)}
                role="button"
                tabIndex={0}
                aria-label="Touch to start breathing exercise"
              >
                <span className="text-4xl">
                  {uiState === 'amber' ? '🛡️' : '🍃'}
                </span>
              </motion.div>

              {/* Calming prompt */}
              <AnimatePresence>
                {currentPrompt && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-lg text-[var(--text-primary)] mb-4 px-4"
                  >
                    {currentPrompt}
                  </motion.p>
                )}
              </AnimatePresence>

              <p className="text-sm text-[var(--text-muted)]">
                {uiState === 'amber' 
                  ? 'Touch the circle to breathe' 
                  : 'Listening... Everything sounds calm'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Breathing Exercise Modal */}
      <AnimatePresence>
        {showBreathing && (
          <BreathingExercise
            isOpen={showBreathing}
            onClose={() => setShowBreathing(false)}
            onComplete={() => setShowBreathing(false)}
          />
        )}
      </AnimatePresence>

      {/* Check-in Modal */}
      <AnimatePresence>
        {showCheckIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-end justify-center p-4 z-50"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-[var(--bg-card)] rounded-2xl p-6 w-full max-w-md"
            >
              <p className="text-lg text-[var(--text-primary)] mb-4 text-center">
                That got loud. Want to pause and breathe?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleCheckInResponse('yes')}
                  className="flex-1 py-3 px-4 bg-[var(--color-calm-600)] text-white rounded-xl font-medium hover:bg-[var(--color-calm-500)] transition-colors min-h-[44px]"
                >
                  Yes
                </button>
                <button
                  onClick={() => handleCheckInResponse('no')}
                  className="flex-1 py-3 px-4 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-primary)] transition-colors min-h-[44px]"
                >
                  No
                </button>
                <button
                  onClick={() => handleCheckInResponse('not_now')}
                  className="flex-1 py-3 px-4 bg-[var(--bg-secondary)] text-[var(--text-muted)] rounded-xl font-medium hover:bg-[var(--bg-primary)] transition-colors min-h-[44px]"
                >
                  Not now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
