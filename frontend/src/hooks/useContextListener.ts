/**
 * useContextListener Hook
 * 
 * Real-time audio streaming and context analysis for the Context Clues feature.
 * 
 * Two modes:
 * 1. STREAMING MODE (default): Continuous audio streaming with ~150ms latency
 *    - Uses ScriptProcessorNode to capture raw PCM audio
 *    - Streams directly to backend via Socket.io
 *    - Backend forwards to ElevenLabs Realtime WebSocket
 *    
 * 2. CHUNKED MODE (legacy): 4-second chunks for batch processing
 *    - Uses MediaRecorder for chunk-based recording
 *    - Higher latency but more stable
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

// ============================================================================
// Types
// ============================================================================

export type EnvironmentAssessment = 'friendly' | 'neutral' | 'tense' | 'unknown';
export type StreamingMode = 'streaming' | 'chunked';

export interface AudioEvent {
  event: string;
  interpretation: string;
  confidence?: number;
  timestamp: number;
}

export interface RealtimeTranscript {
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export interface ContextUpdate {
  timestamp: number;
  transcript: string;
  audioEvents: string[];
  speakers: number;
  assessment: EnvironmentAssessment;
  summary: string;
  triggers: string[];
  confidence: number;
  recommendations: string[];
}

export interface CalmingAudio {
  audioUrl: string;
  summary: string;
}

export interface StatusUpdate {
  step: 'processing' | 'analyzing' | 'generating' | 'complete';
  message: string;
}

export interface UseContextListenerOptions {
  apiUrl?: string;
  mode?: StreamingMode;
  chunkDuration?: number;  // ms for chunked mode
  userId?: string;
  autoConnect?: boolean;
  sampleRate?: number;     // Audio sample rate (default: 16000)
}

export interface UseContextListenerReturn {
  // Connection state
  isConnected: boolean;
  isStreaming: boolean;
  isListening: boolean;  // Alias for backward compatibility
  sessionId: string | null;
  mode: StreamingMode;
  
  // Analysis data
  currentContext: ContextUpdate | null;
  recentEvents: AudioEvent[];
  liveTranscript: string;
  calmingAudio: CalmingAudio | null;
  status: StatusUpdate | null;
  error: string | null;
  
  // Actions
  startListening: () => Promise<void>;
  stopListening: () => void;
  connect: () => void;
  disconnect: () => void;
  clearError: () => void;
  setMode: (mode: StreamingMode) => void;
  
  // Audio level (for visualization)
  audioLevel: number;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useContextListener(
  options: UseContextListenerOptions = {}
): UseContextListenerReturn {
  const {
    apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001',
    mode: initialMode = 'streaming',
    chunkDuration = 4000,
    userId = 'demo-user',
    autoConnect = false,
    sampleRate = 16000,
  } = options;

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<StreamingMode>(initialMode);
  
  // FIX: Use ref for isStreaming to avoid stale closure in onaudioprocess callback
  const isStreamingRef = useRef(false);
  
  // Analysis data
  const [currentContext, setCurrentContext] = useState<ContextUpdate | null>(null);
  const [recentEvents, setRecentEvents] = useState<AudioEvent[]>([]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [calmingAudio, setCalmingAudio] = useState<CalmingAudio | null>(null);
  const [status, setStatus] = useState<StatusUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Audio level for visualization
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Refs
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // ============================================================================
  // Socket Connection
  // ============================================================================

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(apiUrl, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('🔌 Connected to Context Clues server');
      setIsConnected(true);
      setError(null);
      socket.emit('auth', { userId });
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from Context Clues server');
      setIsConnected(false);
      setIsStreaming(false);
      setSessionId(null);
    });

    // Session events
    socket.on('session:started', (data: { sessionId: string }) => {
      setSessionId(data.sessionId);
      console.log('🎧 Session started:', data.sessionId);
    });

    socket.on('session:ended', () => {
      setSessionId(null);
      console.log('🛑 Session ended');
    });

    // Streaming events
    socket.on('stream:connected', () => {
      console.log('✅ Realtime stream connected');
      setStatus({ step: 'processing', message: 'Listening...' });
    });

    socket.on('stream:disconnected', (data: { reason: string }) => {
      console.log('❌ Realtime stream disconnected:', data.reason);
    });

    socket.on('stream:stopped', () => {
      setIsStreaming(false);
      setStatus(null);
    });

    // Real-time transcript (~150ms latency)
    socket.on('transcript:realtime', (data: RealtimeTranscript) => {
      if (data.isFinal) {
        setLiveTranscript(prev => prev + ' ' + data.text);
      } else {
        // Show partial transcript
        setLiveTranscript(prev => {
          const parts = prev.split(' ');
          // Replace last partial with new one
          if (parts.length > 0) {
            parts[parts.length - 1] = data.text;
            return parts.join(' ');
          }
          return data.text;
        });
      }
    });

    // Audio events (instant, ~150ms)
    socket.on('event:detected', (data: AudioEvent) => {
      setRecentEvents(prev => [data, ...prev].slice(0, 10));
    });

    // Context updates (periodic, every 5s from Gemini)
    socket.on('context:update', (data: ContextUpdate) => {
      setCurrentContext(data);
      if (data.transcript) {
        setLiveTranscript(data.transcript);
      }
    });

    // Speaker changes
    socket.on('speaker:change', (data: { speakerId: number; timestamp: number }) => {
      console.log('👤 Speaker changed:', data.speakerId);
    });

    // Calming audio
    socket.on('calming:audio', (data: CalmingAudio) => {
      setCalmingAudio(data);
    });

    // Status updates
    socket.on('status', (data: StatusUpdate) => {
      setStatus(data);
    });

    // Errors
    socket.on('error', (data: { message: string }) => {
      setError(data.message);
      setStatus(null);
    });

    socketRef.current = socket;
  }, [apiUrl, userId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsStreaming(false);
    setSessionId(null);
  }, []);

  // ============================================================================
  // Streaming Mode: Continuous Audio
  // ============================================================================

  const startStreaming = useCallback(async () => {
    if (!socketRef.current?.connected) {
      setError('Not connected to server');
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: sampleRate,
        },
      });
      streamRef.current = stream;

      // Create audio context for processing
      audioContextRef.current = new AudioContext({ sampleRate });
      const source = audioContextRef.current.createMediaStreamSource(stream);

      // Set up analyzer for level visualization
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Create ScriptProcessorNode to capture raw PCM audio
      // Buffer size of 4096 samples at 16kHz = ~256ms chunks
      const bufferSize = 4096;
      processorRef.current = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
      
      processorRef.current.onaudioprocess = (event) => {
        // FIX: Use ref instead of state to avoid stale closure
        // The callback captures isStreaming=false at creation time, but ref is always current
        if (!socketRef.current?.connected || !isStreamingRef.current) return;
        
        const inputBuffer = event.inputBuffer.getChannelData(0);
        
        // Convert Float32 to Int16 (PCM 16-bit)
        const pcmData = new Int16Array(inputBuffer.length);
        for (let i = 0; i < inputBuffer.length; i++) {
          // Clamp and convert to 16-bit signed integer
          const s = Math.max(-1, Math.min(1, inputBuffer[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Send raw PCM audio to backend
        socketRef.current?.emit('audio:stream', pcmData.buffer);
      };

      // Connect the processor
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Start audio level monitoring
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
        }
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

      // FIX: Set ref BEFORE starting session so onaudioprocess callback sees it immediately
      isStreamingRef.current = true;
      
      // Start session and streaming
      socketRef.current.emit('session:start');
      socketRef.current.emit('stream:start');
      
      setIsStreaming(true);
      setError(null);
      setLiveTranscript('');
      setRecentEvents([]);

    } catch (err: any) {
      console.error('Failed to start streaming:', err);
      setError(err.message || 'Failed to access microphone');
    }
  }, [sampleRate, isStreaming]);

  const stopStreaming = useCallback(() => {
    // FIX: Set ref to false FIRST to stop audio processing immediately
    isStreamingRef.current = false;
    
    // Stop processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop streaming on backend
    if (socketRef.current?.connected) {
      socketRef.current.emit('stream:stop');
      socketRef.current.emit('session:end');
    }

    setIsStreaming(false);
    setAudioLevel(0);
    setStatus(null);
  }, []);

  // ============================================================================
  // Chunked Mode: Legacy batch processing
  // ============================================================================

  const startChunked = useCallback(async () => {
    if (!socketRef.current?.connected) {
      setError('Not connected to server');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const updateAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
        }
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (chunks.length > 0 && socketRef.current?.connected) {
          const audioBlob = new Blob(chunks, { type: mimeType });
          
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = (reader.result as string).split(',')[1];
            socketRef.current?.emit('audio:chunk', {
              audio: base64Audio,
              duration: chunkDuration,
              decibels: Math.round(audioLevel * 100),
            });
          };
          reader.readAsDataURL(audioBlob);
          chunks.length = 0;
        }

        // Restart if still listening
        if (isStreaming && mediaRecorderRef.current) {
          mediaRecorderRef.current.start();
          setTimeout(() => {
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
          }, chunkDuration);
        }
      };

      socketRef.current.emit('session:start');
      mediaRecorder.start();
      setIsStreaming(true);
      setError(null);

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, chunkDuration);

    } catch (err: any) {
      console.error('Failed to start chunked recording:', err);
      setError(err.message || 'Failed to access microphone');
    }
  }, [chunkDuration, audioLevel, isStreaming]);

  const stopChunked = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('session:end');
    }

    setIsStreaming(false);
    setAudioLevel(0);
    setStatus(null);
  }, []);

  // ============================================================================
  // Public API
  // ============================================================================

  const startListening = useCallback(async () => {
    if (mode === 'streaming') {
      await startStreaming();
    } else {
      await startChunked();
    }
  }, [mode, startStreaming, startChunked]);

  const stopListening = useCallback(() => {
    if (mode === 'streaming') {
      stopStreaming();
    } else {
      stopChunked();
    }
  }, [mode, stopStreaming, stopChunked]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // Lifecycle
  // ============================================================================

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      stopListening();
      disconnect();
    };
  }, [autoConnect, connect, disconnect, stopListening]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Connection state
    isConnected,
    isStreaming,
    isListening: isStreaming,  // Alias for backward compatibility
    sessionId,
    mode,
    
    // Analysis data
    currentContext,
    recentEvents,
    liveTranscript,
    calmingAudio,
    status,
    error,
    
    // Actions
    startListening,
    stopListening,
    connect,
    disconnect,
    clearError,
    setMode,
    
    // Audio level
    audioLevel,
  };
}

export default useContextListener;
