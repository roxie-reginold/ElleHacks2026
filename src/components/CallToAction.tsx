"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CallToActionProps {
  userId: string;
  sessionId: string;
  stressLevel?: 'calm' | 'mild' | 'moderate' | 'high';
  onInterventionComplete?: (type: 'breathe' | 'journal' | 'emoji') => void;
}

type InterventionType = 'breathe' | 'pause' | 'check-in' | 'win';

interface Intervention {
  type: InterventionType;
  title: string;
  prompt: string;
  action: string;
  voiceText: string;
  hapticPattern?: number[];
}

export default function CallToAction({ 
  userId, 
  sessionId, 
  stressLevel = 'calm',
  onInterventionComplete 
}: CallToActionProps) {
  const [activeIntervention, setActiveIntervention] = useState<Intervention | null>(null);
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathCount, setBreatheCount] = useState(0);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Intervention configurations
  const interventions: Record<string, Intervention> = {
    stress: {
      type: 'breathe',
      title: 'Take a Breath',
      prompt: "Pause. Breathe. You've got this.",
      action: 'Start Breathing',
      voiceText: "Hey, take a moment. Breathe in slowly... and out. You've got this.",
      hapticPattern: [200, 100, 200] // vibrate 200ms, pause 100ms, vibrate 200ms
    },
    postClass: {
      type: 'check-in',
      title: 'How Are You Feeling?',
      prompt: 'Class is over. How did that go for you?',
      action: 'Tap Your Mood',
      voiceText: "You made it through. How are you feeling right now?",
      hapticPattern: [100]
    },
    win: {
      type: 'win',
      title: 'That Took Courage! 🌟',
      prompt: 'You asked a question! That was brave.',
      action: 'Celebrate',
      voiceText: "You did something brave today. That took real courage. I'm proud of you.",
      hapticPattern: [50, 50, 50, 50] // celebratory pattern
    },
    pause: {
      type: 'pause',
      title: 'Quick Pause',
      prompt: 'Things feel intense. Want to ground yourself?',
      action: 'Ground Me',
      voiceText: "Let's pause for a second. You're safe. This moment will pass.",
      hapticPattern: [300]
    }
  };

  // Trigger intervention based on stress level
  useEffect(() => {
    if (stressLevel === 'high' || stressLevel === 'moderate') {
      triggerIntervention('stress');
    }
  }, [stressLevel]);

  // Trigger haptic feedback
  const triggerHaptic = (pattern: number[] = [200]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // Play ElevenLabs voice
  const playVoice = async (text: string) => {
    try {
      setIsPlayingAudio(true);
      
      // Call your Next.js API route that interfaces with ElevenLabs
      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          voiceId: 'calm_voice', // your ElevenLabs voice ID
          stability: 0.7,
          similarityBoost: 0.8
        })
      });

      if (!response.ok) throw new Error('Voice generation failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
      
      audioRef.current.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };

    } catch (error) {
      console.error('Voice playback error:', error);
      setIsPlayingAudio(false);
    }
  };

  // Trigger an intervention
  const triggerIntervention = (key: string) => {
    const intervention = interventions[key];
    if (!intervention) return;

    setActiveIntervention(intervention);
    triggerHaptic(intervention.hapticPattern);
    
    // Auto-play voice after 500ms
    setTimeout(() => {
      playVoice(intervention.voiceText);
    }, 500);

    // Log to MongoDB
    logIntervention(intervention.type);
  };

  // Log intervention to MongoDB
  const logIntervention = async (type: string) => {
    try {
      await fetch('/api/sessions/intervention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          interventionType: type,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to log intervention:', error);
    }
  };

  // Handle breathing exercise
  const startBreathing = () => {
    setIsBreathing(true);
    setBreatheCount(0);
    onInterventionComplete?.('breathe');
  };

  // Breathing cycle effect
  useEffect(() => {
    if (!isBreathing) return;

    const interval = setInterval(() => {
      setBreatheCount(prev => {
        if (prev >= 6) {
          setIsBreathing(false);
          setActiveIntervention(null);
          return 0;
        }
        triggerHaptic([100]);
        return prev + 1;
      });
    }, 4000); // 4 seconds per breath

    return () => clearInterval(interval);
  }, [isBreathing]);

  // Handle emoji selection
  const handleEmojiSelect = async (emoji: string, mood: string) => {
    setSelectedEmoji(emoji);
    triggerHaptic([50, 50]);
    
    // Save to MongoDB
    try {
      await fetch('/api/sessions/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          mood,
          emoji,
          timestamp: new Date().toISOString()
        })
      });
      
      onInterventionComplete?.('emoji');
      
      // Close after 2 seconds
      setTimeout(() => {
        setActiveIntervention(null);
        setSelectedEmoji(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to save mood:', error);
    }
  };

  // Render breathing exercise
  const renderBreathing = () => (
    <motion.div 
      className="flex flex-col items-center space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400/30 to-emerald-500/30 flex items-center justify-center"
        animate={{
          scale: breathCount % 2 === 0 ? [1, 1.3, 1] : [1.3, 1, 1.3],
        }}
        transition={{
          duration: 4,
          ease: "easeInOut"
        }}
      >
        <div className="text-white text-lg font-light">
          {breathCount % 2 === 0 ? 'Breathe In' : 'Breathe Out'}
        </div>
      </motion.div>
      
      <div className="text-green-100/70 text-sm">
        {Math.floor(breathCount / 2) + 1} / 3 breaths
      </div>
    </motion.div>
  );

  // Render mood check-in
  const renderCheckIn = () => (
    <motion.div 
      className="flex flex-col items-center space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-white/90 text-center text-lg font-light">
        Tap how you feel:
      </div>
      
      <div className="flex gap-6">
        {[
          { emoji: '😌', label: 'calm', mood: 'calm' },
          { emoji: '😐', label: 'okay', mood: 'neutral' },
          { emoji: '😣', label: 'tough', mood: 'stressed' }
        ].map(({ emoji, label, mood }) => (
          <motion.button
            key={emoji}
            onClick={() => handleEmojiSelect(emoji, mood)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
              selectedEmoji === emoji 
                ? 'bg-green-500/30 scale-110' 
                : 'bg-white/5 hover:bg-white/10'
            }`}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-5xl">{emoji}</span>
            <span className="text-white/70 text-xs">{label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );

  // Render win celebration
  const renderWin = () => (
    <motion.div 
      className="flex flex-col items-center space-y-6"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <motion.div
        animate={{
          rotate: [0, 10, -10, 10, 0],
        }}
        transition={{
          duration: 0.5,
          repeat: 2
        }}
        className="text-7xl"
      >
        🌟
      </motion.div>
      
      <div className="text-white text-center space-y-2">
        <div className="text-xl font-light">That took courage</div>
        <div className="text-green-300/70 text-sm">+1 Focus Moment earned</div>
      </div>
      
      <motion.button
        onClick={() => setActiveIntervention(null)}
        className="px-6 py-2 rounded-full bg-green-500/20 hover:bg-green-500/30 text-white text-sm transition-colors"
        whileTap={{ scale: 0.95 }}
      >
        Thanks ✨
      </motion.button>
    </motion.div>
  );

  // Render pause intervention
  const renderPause = () => (
    <motion.div 
      className="flex flex-col items-center space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="text-white/90 text-center space-y-3">
        <div className="text-xl font-light">You're safe</div>
        <div className="text-green-100/60 text-sm max-w-xs">
          This moment will pass. You've handled moments like this before.
        </div>
      </div>
      
      <div className="flex gap-4">
        <motion.button
          onClick={startBreathing}
          className="px-6 py-3 rounded-full bg-green-500/20 hover:bg-green-500/30 text-white text-sm transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          Breathing Exercise
        </motion.button>
        
        <motion.button
          onClick={() => setActiveIntervention(null)}
          className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          I'm Okay
        </motion.button>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      {activeIntervention && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isBreathing) {
              setActiveIntervention(null);
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-gradient-to-b from-[#0a2818] to-[#051410] rounded-3xl p-8 max-w-md w-full border border-green-500/10 shadow-2xl"
          >
            {/* Audio indicator */}
            {isPlayingAudio && (
              <div className="absolute top-4 right-4">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-3 h-3 bg-green-400 rounded-full"
                />
              </div>
            )}

            {/* Header */}
            <div className="text-center mb-8">
              <h3 className="text-white text-2xl font-light mb-2">
                {activeIntervention.title}
              </h3>
              <p className="text-green-100/60 text-sm">
                {activeIntervention.prompt}
              </p>
            </div>

            {/* Dynamic content based on intervention type */}
            {isBreathing ? renderBreathing() : 
             activeIntervention.type === 'check-in' ? renderCheckIn() :
             activeIntervention.type === 'win' ? renderWin() :
             activeIntervention.type === 'pause' ? renderPause() :
             (
              <motion.button
                onClick={startBreathing}
                className="w-full py-4 rounded-full bg-green-500/20 hover:bg-green-500/30 text-white transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                {activeIntervention.action}
              </motion.button>
            )}

            {/* Close button (hidden during breathing) */}
            {!isBreathing && activeIntervention.type !== 'win' && (
              <button
                onClick={() => setActiveIntervention(null)}
                className="absolute top-4 left-4 text-white/40 hover:text-white/70 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
