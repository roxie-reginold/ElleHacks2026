import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioRecorderProps {
  onSubmit: (audioBlob: Blob | null, audioFile: File | null) => void;
}

type Tab = 'record' | 'upload';

export default function AudioRecorder({ onSubmit }: AudioRecorderProps) {
  const [activeTab, setActiveTab] = useState<Tab>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setAudioBlob(null);
    }
  };

  const handleClear = () => {
    setAudioBlob(null);
    setAudioFile(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingTime(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    onSubmit(audioBlob, audioFile);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasAudio = audioBlob || audioFile;

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['record', 'upload'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              handleClear();
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors min-h-[44px] ${
              activeTab === tab
                ? 'bg-[var(--color-calm-600)] text-white'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {tab === 'record' ? '🎙️ Record' : '📁 Upload'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'record' ? (
          <motion.div
            key="record"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="text-center"
          >
            {!hasAudio ? (
              <>
                {/* Recording button */}
                <motion.button
                  onClick={isRecording ? stopRecording : startRecording}
                  whileTap={{ scale: 0.95 }}
                  className={`w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center transition-colors ${
                    isRecording
                      ? 'bg-red-500/20 border-2 border-red-400'
                      : 'bg-[var(--color-calm-600)]/20 border-2 border-[var(--color-calm-400)] hover:bg-[var(--color-calm-600)]/30'
                  }`}
                  aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                  {isRecording ? (
                    <motion.div
                      className="w-8 h-8 bg-red-400 rounded-sm"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-[var(--color-calm-400)] rounded-full" />
                  )}
                </motion.button>

                {isRecording && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[var(--text-primary)] text-lg font-mono"
                  >
                    {formatTime(recordingTime)}
                  </motion.p>
                )}

                <p className="text-[var(--text-muted)] text-sm mt-2">
                  {isRecording ? 'Tap to stop' : 'Tap to start recording'}
                </p>
              </>
            ) : (
              /* Preview */
              <div className="p-4 bg-[var(--bg-card)] rounded-xl">
                <audio
                  src={audioUrl || undefined}
                  controls
                  className="w-full mb-4"
                />
                <p className="text-[var(--text-muted)] text-sm mb-4">
                  Duration: {formatTime(recordingTime)}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleClear}
                    className="flex-1 py-3 px-4 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-primary)] transition-colors min-h-[44px]"
                  >
                    Re-record
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 py-3 px-4 bg-[var(--color-calm-600)] text-white rounded-xl font-medium hover:bg-[var(--color-calm-500)] transition-colors min-h-[44px]"
                  >
                    Analyze
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {!hasAudio ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-[var(--color-calm-600)]/50 rounded-xl text-center cursor-pointer hover:border-[var(--color-calm-400)] transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="text-4xl mb-4">📁</div>
                <p className="text-[var(--text-primary)] mb-2">
                  Tap to select audio file
                </p>
                <p className="text-[var(--text-muted)] text-sm">
                  MP3, WAV, M4A, WebM supported
                </p>
              </div>
            ) : (
              /* Preview */
              <div className="p-4 bg-[var(--bg-card)] rounded-xl">
                <p className="text-[var(--text-primary)] mb-2 truncate">
                  📁 {audioFile?.name}
                </p>
                <audio
                  src={audioUrl || undefined}
                  controls
                  className="w-full mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleClear}
                    className="flex-1 py-3 px-4 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-primary)] transition-colors min-h-[44px]"
                  >
                    Choose different
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 py-3 px-4 bg-[var(--color-calm-600)] text-white rounded-xl font-medium hover:bg-[var(--color-calm-500)] transition-colors min-h-[44px]"
                  >
                    Analyze
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Consent reminder */}
      <p className="text-[var(--text-muted)] text-xs text-center mt-6">
        Audio is processed privately. No recordings are stored without your permission.
      </p>
    </div>
  );
}
