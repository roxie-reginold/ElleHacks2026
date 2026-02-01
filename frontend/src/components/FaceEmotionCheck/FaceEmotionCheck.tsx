/**
 * Face Emotion Check — Visual Analysis (per VisualAnalysisSpec.md)
 * - Opt-in, user-triggered. No camera until user clicks "Check how I feel".
 * - face-api.js runs entirely in the browser; no video or face data is stored or sent anywhere.
 * - Camera stream is used only for live display and in-memory inference; stopped on close.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera } from 'lucide-react';

export type DisplayEmotion = 'sad' | 'happy' | 'confused';

export interface FaceEmotionCheckProps {
  onClose?: () => void;
  onEmotionChange?: (emotion: DisplayEmotion) => void;
  className?: string;
}

const MODEL_BASE = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights/';
const INFERENCE_INTERVAL_MS = 350; // ~2–3 FPS
const MIN_CONFIDENCE = 0.2;

type ExpressionScores = Record<string, number>;

function mapExpressionsToDisplay(expressions: ExpressionScores): { label: DisplayEmotion; confidence: number } {
  const keys = Object.keys(expressions);
  if (keys.length === 0) return { label: 'confused', confidence: 0 };

  const maxKey = keys.reduce((a, b) => (expressions[a] > expressions[b] ? a : b));
  const maxScore = expressions[maxKey] ?? 0;

  if (maxScore < MIN_CONFIDENCE) {
    return { label: 'confused', confidence: maxScore };
  }

  if (maxKey === 'happy') return { label: 'happy', confidence: maxScore };
  if (maxKey === 'sad') return { label: 'sad', confidence: maxScore };
  // surprised, neutral, fearful, angry, disgusted -> Confused
  return { label: 'confused', confidence: maxScore };
}

export function FaceEmotionCheck({ onClose, onEmotionChange, className }: FaceEmotionCheckProps) {
  const [expanded, setExpanded] = useState(false);
  const [permission, setPermission] = useState<'not-asked' | 'granted' | 'denied'>('not-asked');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [emotion, setEmotion] = useState<{ label: DisplayEmotion; confidence: number } | null>(null);
  const [noFace, setNoFace] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faceApiRef = useRef<typeof import('face-api.js') | null>(null);
  const onEmotionChangeRef = useRef(onEmotionChange);
  const breathingTriggeredForRef = useRef<DisplayEmotion | null>(null);
  const breathingDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onEmotionChangeRef.current = onEmotionChange;

  const PAUSE_BEFORE_BREATHING_MS = 2500; // Show emotion first, then trigger breathing

  const stopCamera = useCallback(() => {
    if (breathingDelayTimeoutRef.current) {
      clearTimeout(breathingDelayTimeoutRef.current);
      breathingDelayTimeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setEmotion(null);
    setNoFace(false);
    breathingTriggeredForRef.current = null;
  }, []);

  const close = useCallback(() => {
    stopCamera();
    setExpanded(false);
    setPermission('not-asked');
    setModelsLoaded(false);
    setModelError(null);
    onClose?.();
  }, [stopCamera, onClose]);

  // Load face-api.js and models only when user opens the component
  useEffect(() => {
    if (!expanded) return;

    let cancelled = false;
    setModelError(null);

    (async () => {
      try {
        const faceapi = await import('face-api.js');
        faceApiRef.current = faceapi;

        const base = MODEL_BASE;
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(base),
          faceapi.nets.faceExpressionNet.loadFromUri(base),
        ]);
        if (cancelled) return;
        setModelsLoaded(true);
      } catch (e) {
        if (cancelled) return;
        setModelError(e instanceof Error ? e.message : 'Failed to load face analysis');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [expanded]);

  // Request camera when models are ready
  useEffect(() => {
    if (!expanded || !modelsLoaded || !faceApiRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setPermission('granted');
      } catch {
        if (!cancelled) setPermission('denied');
        return;
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [expanded, modelsLoaded, stopCamera]);

  // Attach stream to video once we have both
  useEffect(() => {
    if (permission !== 'granted' || !streamRef.current || !videoRef.current) return;

    const video = videoRef.current;
    const stream = streamRef.current;
    video.srcObject = stream;
    video.play().catch(() => { });

    const faceapi = faceApiRef.current;
    if (!faceapi) return;

    const runInference = async () => {
      if (!streamRef.current || !faceApiRef.current || !videoRef.current) return;
      const v = videoRef.current;
      try {
        const result = await faceapi
          .detectSingleFace(v, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceExpressions();

        if (!result) {
          setNoFace(true);
          setEmotion(null);
          if (breathingDelayTimeoutRef.current) {
            clearTimeout(breathingDelayTimeoutRef.current);
            breathingDelayTimeoutRef.current = null;
          }
          return;
        }
        setNoFace(false);
        const scores: ExpressionScores = { ...result.expressions };
        const { label, confidence } = mapExpressionsToDisplay(scores);
        setEmotion({ label, confidence });

        // Trigger breathing prompt for sad or confused emotions via parent component
        const triggerLabel = label === 'sad' || label === 'confused' ? label : null;
        if (triggerLabel) {
          if (breathingTriggeredForRef.current === triggerLabel) {
            // Already triggered for this bout — do nothing
          } else if (breathingDelayTimeoutRef.current === null) {
            breathingDelayTimeoutRef.current = setTimeout(() => {
              breathingDelayTimeoutRef.current = null;
              breathingTriggeredForRef.current = triggerLabel;
              // Call parent to show the breathing prompt overlay
              onEmotionChangeRef.current?.(triggerLabel);
            }, PAUSE_BEFORE_BREATHING_MS);
          }
        } else {
          if (breathingDelayTimeoutRef.current) {
            clearTimeout(breathingDelayTimeoutRef.current);
            breathingDelayTimeoutRef.current = null;
          }
          breathingTriggeredForRef.current = null;
        }
      } catch {
        setNoFace(true);
        setEmotion(null);
      }
    };

    intervalRef.current = setInterval(runInference, INFERENCE_INTERVAL_MS);
    runInference();

    return () => {
      if (breathingDelayTimeoutRef.current) {
        clearTimeout(breathingDelayTimeoutRef.current);
        breathingDelayTimeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [permission]);

  // Pause when tab is hidden
  useEffect(() => {
    if (!expanded) return;
    const onVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (modelsLoaded && streamRef.current && videoRef.current) {
        if (!intervalRef.current) {
          intervalRef.current = setInterval(async () => {
            if (!faceApiRef.current || !videoRef.current) return;
            try {
              const result = await faceApiRef.current
                .detectSingleFace(
                  videoRef.current,
                  new faceApiRef.current.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
                )
                .withFaceExpressions();
              if (!result) {
                setNoFace(true);
                setEmotion(null);
                return;
              }
              setNoFace(false);
              const scores: ExpressionScores = { ...result.expressions };
              const { label, confidence } = mapExpressionsToDisplay(scores);
              setEmotion({ label, confidence });
            } catch {
              setNoFace(true);
              setEmotion(null);
            }
          }, INFERENCE_INTERVAL_MS);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [expanded, modelsLoaded]);

  // Entry: collapsed button - matching the green theme design
  if (!expanded) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={className ?? 'mt-6'}
      >
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Mood Analyser</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Use your camera to see how you might be feeling. Stays on this device — nothing is saved or sent.
          </p>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl bg-secondary border border-border text-foreground hover:bg-secondary/80 hover:border-primary/30 transition-all min-h-[52px] group"
            aria-label="Open Mood Analyser — camera and face emotion"
          >
            <Camera className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-medium">Mood Analyser</span>
          </button>
          <p className="text-center text-muted-foreground text-xs mt-2">
            Tap to use your camera and see how you might be feeling. Stays on this device — nothing is saved or sent.
          </p>
        </div>
      </motion.div>
    );
  }

  // Expanded: camera + emotion panel - matching green theme design
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-foreground">Mood Analyser</span>
        <button
          type="button"
          onClick={close}
          className="text-sm text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
        >
          Stop camera
        </button>
      </div>

      {modelError && (
        <p className="text-sm text-destructive mb-3">{modelError}</p>
      )}

      {permission === 'denied' && (
        <p className="text-sm text-muted-foreground mb-3">
          Camera access was denied. You can still use Context Listen.
        </p>
      )}

      {modelsLoaded && (
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Camera view */}
          <div className="relative shrink-0 rounded-xl overflow-hidden bg-muted aspect-square max-w-[200px] mx-auto sm:mx-0 border border-border">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
              aria-label="Live camera preview for Mood Analyser"
            />
            {permission === 'not-asked' && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm">
                <div className="flex flex-col items-center gap-2">
                  <Camera className="h-8 w-8" />
                  <span>Requesting camera…</span>
                </div>
              </div>
            )}
          </div>

          {/* Emotion result */}
          <div className="flex-1 flex flex-col justify-center min-w-0">
            {permission === 'granted' ? (
              <AnimatePresence mode="wait">
                {noFace && !emotion && (
                  <motion.p
                    key="no-face"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-muted-foreground text-sm"
                  >
                    No face detected. Move into frame.
                  </motion.p>
                )}
                {emotion && (
                  <motion.div
                    key={emotion.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className="text-foreground font-medium capitalize text-lg">
                      {emotion.label === 'happy' && '😊 '}
                      {emotion.label === 'sad' && '😔 '}
                      {emotion.label === 'confused' && '😕 '}
                      {emotion.label}
                      {emotion.confidence >= 0.5 && (
                        <span className="text-muted-foreground font-normal text-sm ml-2">
                          ({Math.round(emotion.confidence * 100)}%)
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      It's okay to feel this way.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : permission === 'not-asked' ? (
              <p className="text-muted-foreground text-sm">Allow camera to see your mood.</p>
            ) : null}
          </div>
        </div>
      )}

      {expanded && permission === 'not-asked' && !modelError && !modelsLoaded && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm">Loading face analysis…</span>
        </div>
      )}
    </motion.div>
  );
}
