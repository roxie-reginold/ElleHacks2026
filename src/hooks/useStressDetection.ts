"use client";

import { useState, useEffect, useRef } from 'react';

interface StressDetection {
  level: 'calm' | 'mild' | 'moderate' | 'high';
  confidence: number;
  triggers: string[];
  timestamp: number;
}

interface UseStressDetectionOptions {
  sessionId: string;
  userId: string;
  enabled?: boolean;
  checkIntervalMs?: number;
}

export function useStressDetection({
  sessionId,
  userId,
  enabled = true,
  checkIntervalMs = 5000 // Check every 5 seconds
}: UseStressDetectionOptions) {
  const [stressLevel, setStressLevel] = useState<'calm' | 'mild' | 'moderate' | 'high'>('calm');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastDetection, setLastDetection] = useState<StressDetection | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize audio context and microphone
  useEffect(() => {
    if (!enabled) return;

    const initAudio = async () => {
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        streamRef.current = stream;

        // Create audio context and analyzer
        audioContextRef.current = new AudioContext();
        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 2048;

        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyzerRef.current);

      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    };

    initAudio();

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [enabled]);

  // Analyze audio periodically
  useEffect(() => {
    if (!enabled || !analyzerRef.current) return;

    const analyze = async () => {
      if (isAnalyzing) return;
      
      setIsAnalyzing(true);

      try {
        // Get audio data
        const dataArray = new Uint8Array(analyzerRef.current!.bufferLength);
        analyzerRef.current!.getByteFrequencyData(dataArray);

        // Calculate volume (simple average)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const volumeDb = Math.round(average);

        // Send to Gemini for analysis
        const response = await fetch('/api/analyze/stress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userId,
            volumeDb,
            audioData: Array.from(dataArray.slice(0, 100)), // Send sample
            timestamp: Date.now()
          })
        });

        if (response.ok) {
          const detection: StressDetection = await response.json();
          setStressLevel(detection.level);
          setLastDetection(detection);
        }

      } catch (error) {
        console.error('Stress analysis error:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    const interval = setInterval(analyze, checkIntervalMs);

    return () => clearInterval(interval);
  }, [enabled, sessionId, userId, checkIntervalMs, isAnalyzing]);

  return {
    stressLevel,
    lastDetection,
    isAnalyzing,
  };
}
