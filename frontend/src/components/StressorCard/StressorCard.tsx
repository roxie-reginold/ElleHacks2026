import { motion } from 'framer-motion';

interface StressorCardProps {
  type: string;
  confidence: number;
  note: string;
  timestamp?: number;
}

const TYPE_LABELS: { [key: string]: { label: string; icon: string } } = {
  fast_speech: { label: 'Fast Speech', icon: '🗣️' },
  laughter_spike: { label: 'Sudden Laughter', icon: '😄' },
  harsh_tone: { label: 'Harsh Tone', icon: '😤' },
  sarcasm_likely: { label: 'Possible Sarcasm', icon: '🙃' },
  crowd_noise: { label: 'Background Noise', icon: '👥' },
  urgent_tone: { label: 'Urgent Tone', icon: '⚡' },
  frustrated_tone: { label: 'Frustrated Tone', icon: '😓' },
};

export default function StressorCard({ type, confidence, note }: StressorCardProps) {
  const typeInfo = TYPE_LABELS[type] || { label: type, icon: '❓' };
  const confidencePercent = Math.round(confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-amber-900/20 border border-amber-600/30 rounded-xl"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" role="img" aria-hidden="true">
          {typeInfo.icon}
        </span>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-medium text-amber-200">
              {typeInfo.label}
            </h3>
            <span className="text-xs text-amber-400/70">
              {confidencePercent}% confidence
            </span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm">
            {note}
          </p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-3 h-1 bg-amber-900/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${confidencePercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-amber-400/50 rounded-full"
        />
      </div>
    </motion.div>
  );
}
