/**
 * Face Emotion Check — Visual Analysis (per VisualAnalysisSpec.md)
 * - Opt-in, user-triggered. No camera until user clicks "Check how I feel".
 * - face-api.js runs entirely in the browser; no video or face data is stored or sent anywhere.
 * - Camera stream is used only for live display and in-memory inference; stopped on close.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

const SUPPORT_LINES: Record<DisplayEmotion, string> = {
  happy: "It's okay to feel this way.",
  sad: "It's okay to feel this way.",
  confused: "It's okay to feel this way.",
};

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

  const stopCamera = useCallback(() => {
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

  // Request camera when models are ready (don't require videoRef — video is rendered when modelsLoaded)
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

      // Inference loop starts after stream is attached to video (see effect below)
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [expanded, modelsLoaded, stopCamera]);

  // Attach stream to video once we have both (runs after permission === 'granted' and video is mounted)
  useEffect(() => {
    if (permission !== 'granted' || !streamRef.current || !videoRef.current) return;

    const video = videoRef.current;
    const stream = streamRef.current;
    video.srcObject = stream;
    video.play().catch(() => {});

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
          return;
        }
        setNoFace(false);
        const scores: ExpressionScores = { ...result.expressions };
        const { label, confidence } = mapExpressionsToDisplay(scores);
        setEmotion({ label, confidence });
        onEmotionChange?.(label);
      } catch {
        setNoFace(true);
        setEmotion(null);
      }
    };

    intervalRef.current = setInterval(runInference, INFERENCE_INTERVAL_MS);
    runInference();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [permission, onEmotionChange]);

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

  // Entry: collapsed button
  if (!expanded) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={className ?? 'mt-6'}
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors min-h-[52px]"
          aria-label="Open Mood Analyser — camera and face emotion"
        >
          <span className="text-2xl" aria-hidden>📷</span>
          <span className="font-medium">Mood Analyser</span>
        </button>
        <p className="text-center text-[var(--text-muted)] text-xs mt-2">
          Tap to use your camera and see how you might be feeling. Stays on this device — nothing is saved or sent.
        </p>
      </motion.div>
    );
  }

  // Expanded: camera + emotion panel
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[var(--text-primary)]">Mood Analyser</span>
        <button
          type="button"
          onClick={close}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
        >
          Stop camera
        </button>
      </div>

      {modelError && (
        <p className="text-sm text-red-500 mb-3">{modelError}</p>
      )}

      {permission === 'denied' && (
        <p className="text-sm text-[var(--text-muted)] mb-3">
          Camera access was denied. You can still use Context Listen.
        </p>
      )}

      {modelsLoaded && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative shrink-0 rounded-lg overflow-hidden bg-black aspect-square max-w-[240px] mx-auto sm:mx-0">
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
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-sm">
                Requesting camera…
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col justify-center min-w-0">
            {permission === 'granted' ? (
              <AnimatePresence mode="wait">
                {noFace && !emotion && (
                  <motion.p
                    key="no-face"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[var(--text-muted)] text-sm"
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
                    <p className="text-[var(--text-primary)] font-medium capitalize">
                      {emotion.label}
                      {emotion.confidence >= 0.5 && (
                        <span className="text-[var(--text-muted)] font-normal ml-1">
                          ({Math.round(emotion.confidence * 100)}%)
                        </span>
                      )}
                    </p>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                      {SUPPORT_LINES[emotion.label]}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : permission === 'not-asked' ? (
              <p className="text-[var(--text-muted)] text-sm">Allow camera to see your mood.</p>
            ) : null}
          </div>
        </div>
      )}

      {expanded && permission === 'not-asked' && !modelError && !modelsLoaded && (
        <p className="text-sm text-[var(--text-muted)]">Loading face analysis…</p>
      )}
    </motion.div>
  );
}
