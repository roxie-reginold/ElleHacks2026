import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import type { TrustedAdult } from '../context/UserContext';
import { deleteProfile } from '../services/api';

export default function Profile() {
  const { user, updatePreferences } = useUser();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [readingLevel, setReadingLevel] = useState(user?.readingLevelGrade || 7);
  const [sensitivity, setSensitivity] = useState<'low' | 'med' | 'high'>(user?.sensitivity || 'med');
  const [trustedAdult, setTrustedAdult] = useState<TrustedAdult | undefined>(user?.trustedAdult);
  const [showTrustedAdultForm, setShowTrustedAdultForm] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await updatePreferences({
      displayName,
      readingLevelGrade: readingLevel,
      sensitivity,
      trustedAdult,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearHistory = () => {
    if (confirm('This will delete all your session history. Are you sure?')) {
      localStorage.removeItem('whisper-sessions');
      localStorage.removeItem('whisper-journals');
      alert('History cleared.');
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm('This will delete all your data. This cannot be undone. Are you sure?')) {
      try {
        // Delete from backend if user has an ID
        if (user?._id) {
          await deleteProfile(user._id);
        }
      } catch (error) {
        console.error('Failed to delete profile from server:', error);
        // Continue with local deletion even if backend fails
      }
      
      // Clear local storage
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-8 pb-24 overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-medium text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Customize your experience
        </p>
      </motion.div>

      <div className="space-y-6">
        {/* Display Name */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-[var(--bg-card)] rounded-xl"
        >
          <label className="block text-sm text-[var(--text-secondary)] mb-2">
            What should we call you?
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Friend"
            className="w-full px-4 py-3 bg-[var(--bg-secondary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-calm-500)]"
          />
        </motion.section>

        {/* Reading Level */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-[var(--bg-card)] rounded-xl"
        >
          <label className="block text-sm text-[var(--text-secondary)] mb-2">
            Reading Level: Grade {readingLevel}
          </label>
          <input
            type="range"
            min="6"
            max="10"
            value={readingLevel}
            onChange={(e) => setReadingLevel(Number(e.target.value))}
            className="w-full h-2 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-calm-500)]"
          />
          <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
            <span>Grade 6 (Simpler)</span>
            <span>Grade 10 (More detail)</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            This affects how recaps are written for you.
          </p>
        </motion.section>

        {/* Sensitivity */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 bg-[var(--bg-card)] rounded-xl"
        >
          <label className="block text-sm text-[var(--text-secondary)] mb-3">
            Detection Sensitivity
          </label>
          <div className="flex gap-2">
            {(['low', 'med', 'high'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setSensitivity(level)}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors min-h-[44px] ${
                  sensitivity === level
                    ? 'bg-[var(--color-calm-600)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-primary)]'
                }`}
              >
                {level === 'low' && 'Low'}
                {level === 'med' && 'Medium'}
                {level === 'high' && 'High'}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {sensitivity === 'low' && 'Only detect obvious stressors'}
            {sensitivity === 'med' && 'Balanced detection (recommended)'}
            {sensitivity === 'high' && 'Detect subtle cues too'}
          </p>
        </motion.section>

        {/* Trusted Adult */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-4 bg-[var(--bg-card)] rounded-xl"
        >
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm text-[var(--text-secondary)]">
              Trusted Adult (Optional)
            </label>
            <button
              onClick={() => setShowTrustedAdultForm(!showTrustedAdultForm)}
              className="text-[var(--color-calm-400)] text-sm hover:text-[var(--color-calm-300)]"
            >
              {showTrustedAdultForm ? 'Cancel' : trustedAdult ? 'Edit' : 'Add'}
            </button>
          </div>

          {trustedAdult && !showTrustedAdultForm && (
            <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
              <p className="text-[var(--text-primary)]">{trustedAdult.name}</p>
              <p className="text-[var(--text-muted)] text-sm">
                {trustedAdult.channel === 'sms' ? '📱' : '✉️'} {trustedAdult.address}
              </p>
            </div>
          )}

          {showTrustedAdultForm && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Name"
                value={trustedAdult?.name || ''}
                onChange={(e) => setTrustedAdult({ ...trustedAdult!, name: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-calm-500)]"
              />
              <select
                value={trustedAdult?.channel || 'sms'}
                onChange={(e) => setTrustedAdult({ ...trustedAdult!, channel: e.target.value as 'sms' | 'email' })}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-calm-500)]"
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
              <input
                type={trustedAdult?.channel === 'email' ? 'email' : 'tel'}
                placeholder={trustedAdult?.channel === 'email' ? 'Email address' : 'Phone number'}
                value={trustedAdult?.address || ''}
                onChange={(e) => setTrustedAdult({ ...trustedAdult!, address: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-calm-500)]"
              />
              <button
                onClick={() => setShowTrustedAdultForm(false)}
                className="w-full py-3 bg-[var(--color-calm-600)] text-white rounded-lg font-medium hover:bg-[var(--color-calm-500)] transition-colors"
              >
                Save Contact
              </button>
            </div>
          )}

          <p className="text-xs text-[var(--text-muted)] mt-2">
            One-tap message when you need support
          </p>
        </motion.section>

        {/* Save Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleSave}
          className={`w-full py-4 rounded-xl font-medium transition-colors min-h-[44px] ${
            saved
              ? 'bg-[var(--color-calm-700)] text-[var(--color-calm-300)]'
              : 'bg-[var(--color-calm-600)] text-white hover:bg-[var(--color-calm-500)]'
          }`}
        >
          {saved ? '✓ Saved' : 'Save Changes'}
        </motion.button>

        {/* Privacy Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="p-4 bg-[var(--bg-card)] rounded-xl"
        >
          <h3 className="text-sm text-[var(--text-secondary)] mb-3">
            Privacy & Data
          </h3>
          <div className="space-y-2">
            <button
              onClick={handleClearHistory}
              className="w-full py-3 px-4 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg text-left hover:bg-[var(--bg-primary)] transition-colors min-h-[44px]"
            >
              Clear Session History
            </button>
            <button
              onClick={handleDeleteAccount}
              className="w-full py-3 px-4 bg-red-900/20 text-red-400 rounded-lg text-left hover:bg-red-900/30 transition-colors min-h-[44px]"
            >
              Delete All Data
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-3">
            Your data is stored locally on your device. We don't sell or share your information.
          </p>
        </motion.section>

        {/* Quick Links */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="p-4 bg-[var(--bg-card)] rounded-xl"
        >
          <h3 className="text-sm text-[var(--text-secondary)] mb-3">
            Quick Links
          </h3>
          <div className="space-y-2">
            <Link
              to="/context-clues"
              className="flex items-center justify-between w-full py-3 px-4 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-primary)] transition-colors min-h-[44px]"
            >
              <span>Context Clue Library</span>
              <span className="text-[var(--text-muted)]">→</span>
            </Link>
          </div>
        </motion.section>

        {/* About */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="p-4 bg-[var(--bg-card)] rounded-xl text-center"
        >
          <p className="text-[var(--text-primary)] font-medium">Whisper Lite</p>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Quiet courage, powered by AI.
          </p>
          <p className="text-[var(--text-muted)] text-xs mt-2">
            Not a fix—a companion.
          </p>
        </motion.section>
      </div>
    </div>
  );
}
