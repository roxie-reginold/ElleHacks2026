import { useCallback } from 'react';

type HapticType = 'gentle' | 'subtle' | 'strong';

interface HapticsHook {
  triggerHaptic: (type: HapticType) => void;
  isSupported: boolean;
}

/**
 * Hook for triggering haptic feedback using the Vibration API.
 * Falls back gracefully on devices that don't support vibration.
 */
export function useHaptics(): HapticsHook {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const triggerHaptic = useCallback((type: HapticType) => {
    if (!isSupported) {
      // Fallback: Could trigger a visual pulse instead
      console.log(`Haptic feedback (${type}) - device does not support vibration`);
      return;
    }

    try {
      switch (type) {
        case 'gentle':
          // Single gentle vibration for interventions
          navigator.vibrate(100);
          break;
        case 'subtle':
          // Very subtle feedback for UI interactions
          navigator.vibrate(30);
          break;
        case 'strong':
          // Stronger pattern for alerts (use sparingly)
          navigator.vibrate([100, 50, 100]);
          break;
        default:
          navigator.vibrate(50);
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isSupported]);

  return {
    triggerHaptic,
    isSupported,
  };
}

export default useHaptics;
