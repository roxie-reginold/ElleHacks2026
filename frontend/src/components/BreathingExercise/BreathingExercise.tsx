import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useHaptics } from '../../hooks/useHaptics';

interface BreathingExerciseProps {
  onClose: () => void;
}

type Phase = 'inhale' | 'hold' | 'exhale' | 'rest';

const PHASES: { phase: Phase; duration: number; label: string }[] = [
  { phase: 'inhale', duration: 4000, label: 'Breathe in...' },
  { phase: 'hold', duration: 2000, label: 'Hold...' },
  { phase: 'exhale', duration: 6000, label: 'Breathe out...' },
  { phase: 'rest', duration: 1000, label: '' },
];

export default function BreathingExercise({ onClose }: BreathingExerciseProps) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const { triggerHaptic } = useHaptics();

  const currentPhase = PHASES[currentPhaseIndex];
  const totalCycles = 3;

  const startBreathing = useCallback(() => {
    setIsActive(true);
    setCurrentPhaseIndex(0);
    setCycleCount(0);
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const timer = setTimeout(() => {
      // Subtle haptic at phase transitions
      triggerHaptic('subtle');

      const nextIndex = (currentPhaseIndex + 1) % PHASES.length;
      
      if (nextIndex === 0) {
        // Completed a cycle
        const newCycleCount = cycleCount + 1;
        setCycleCount(newCycleCount);
        
        if (newCycleCount >= totalCycles) {
          // Done with all cycles
          setIsActive(false);
          return;
        }
      }
      
      setCurrentPhaseIndex(nextIndex);
    }, currentPhase.duration);

    return () => clearTimeout(timer);
  }, [isActive, currentPhaseIndex, cycleCount, currentPhase.duration, triggerHaptic]);

  const getCircleScale = () => {
    switch (currentPhase.phase) {
      case 'inhale': return 1.3;
      case 'hold': return 1.3;
      case 'exhale': return 1;
      case 'rest': return 1;
      default: return 1;
    }
  };

  const handleTouchStart = () => {
    setIsPressing(true);
    if (!isActive) {
      startBreathing();
    }
  };

  const handleTouchEnd = () => {
    setIsPressing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[var(--bg-primary)]/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Close breathing exercise"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl text-[var(--text-primary)] mb-8"
      >
        {isActive ? 'Breathe with me' : 'Touch to Breathe'}
      </motion.h2>

      {/* Breathing circle */}
      <div className="relative">
        <motion.div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          animate={{
            scale: isActive ? getCircleScale() : isPressing ? 1.1 : 1,
          }}
          transition={{
            duration: currentPhase.duration / 1000,
            ease: 'easeInOut',
          }}
          className={`w-48 h-48 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
            isActive
              ? 'bg-[var(--color-calm-600)]/30 border-2 border-[var(--color-calm-400)]'
              : 'bg-[var(--color-calm-700)]/20 border-2 border-[var(--color-calm-600)]/50 hover:border-[var(--color-calm-500)]'
          }`}
          role="button"
          tabIndex={0}
          aria-label={isActive ? currentPhase.label : 'Start breathing exercise'}
        >
          {/* Inner glow */}
          <motion.div
            animate={{
              scale: isActive ? [0.8, 1, 0.8] : 0.8,
              opacity: isActive ? [0.3, 0.6, 0.3] : 0.3,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute w-32 h-32 rounded-full bg-[var(--color-calm-400)]/20"
          />
          
          {/* Center icon */}
          <span className="text-4xl relative z-10">
            {isActive ? '🍃' : '👆'}
          </span>
        </motion.div>

        {/* Outer rings */}
        {isActive && (
          <>
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 rounded-full border border-[var(--color-calm-400)]/30"
            />
            <motion.div
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.2, 0, 0.2],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.5,
              }}
              className="absolute inset-0 rounded-full border border-[var(--color-calm-400)]/20"
            />
          </>
        )}
      </div>

      {/* Phase label */}
      <motion.p
        key={currentPhase.phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-lg text-[var(--text-primary)] mt-8 h-8"
      >
        {isActive ? currentPhase.label : 'Press and hold to start'}
      </motion.p>

      {/* Progress dots */}
      {isActive && (
        <div className="flex gap-2 mt-6">
          {[...Array(totalCycles)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < cycleCount
                  ? 'bg-[var(--color-calm-400)]'
                  : i === cycleCount
                  ? 'bg-[var(--color-calm-400)]/50'
                  : 'bg-[var(--bg-card)]'
              }`}
            />
          ))}
        </div>
      )}

      {/* Completion message */}
      {!isActive && cycleCount >= totalCycles && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center"
        >
          <p className="text-[var(--text-primary)] mb-4">
            Great job! You did {totalCycles} breathing cycles.
          </p>
          <button
            onClick={onClose}
            className="py-3 px-6 bg-[var(--color-calm-600)] text-white rounded-xl font-medium hover:bg-[var(--color-calm-500)] transition-colors min-h-[44px]"
          >
            I'm ready to continue
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
