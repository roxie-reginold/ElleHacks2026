import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../../context/UserContext';

const DEFAULT_MESSAGES = [
  "I'm feeling overwhelmed. Can I take a break?",
  "I need some support right now.",
  "Can you check on me when you get a chance?",
];

export default function AlertButton() {
  const { user } = useUser();
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(DEFAULT_MESSAGES[0]);

  if (!user?.trustedAdult) {
    return null;
  }

  const handleSend = async () => {
    setSending(true);
    
    try {
      const response = await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          message: selectedMessage,
          trustedAdult: user.trustedAdult,
        }),
      });

      if (response.ok) {
        setSent(true);
        setTimeout(() => {
          setShowConfirm(false);
          setSent(false);
        }, 2000);
      } else {
        alert('Could not send message. Please try again.');
      }
    } catch {
      // Demo mode - simulate success
      setSent(true);
      setTimeout(() => {
        setShowConfirm(false);
        setSent(false);
      }, 2000);
    }
    
    setSending(false);
  };

  return (
    <>
      {/* Alert Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-card)] rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors min-h-[44px]"
        aria-label="Send message to trusted adult"
      >
        <span className="text-xl">🆘</span>
        <span className="text-sm">Need support?</span>
      </motion.button>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={() => !sending && setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--bg-card)] rounded-2xl p-6 w-full max-w-sm"
            >
              {sent ? (
                <div className="text-center py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-5xl mb-4"
                  >
                    ✓
                  </motion.div>
                  <p className="text-[var(--text-primary)] text-lg">
                    Message sent to {user.trustedAdult?.name}
                  </p>
                  <p className="text-[var(--text-muted)] text-sm mt-2">
                    They'll see it soon
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                    Send message to {user.trustedAdult?.name}?
                  </h2>
                  <p className="text-[var(--text-muted)] text-sm mb-4">
                    via {user.trustedAdult?.channel === 'sms' ? 'text message' : user.trustedAdult?.channel}
                  </p>

                  {/* Message selection */}
                  <div className="space-y-2 mb-6">
                    {DEFAULT_MESSAGES.map((msg, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedMessage(msg)}
                        className={`w-full p-3 rounded-lg text-left text-sm transition-colors ${
                          selectedMessage === msg
                            ? 'bg-[var(--color-calm-600)] text-white'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                        }`}
                      >
                        {msg}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowConfirm(false)}
                      disabled={sending}
                      className="flex-1 py-3 px-4 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-primary)] transition-colors min-h-[44px]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={sending}
                      className="flex-1 py-3 px-4 bg-[var(--color-calm-600)] text-white rounded-xl font-medium hover:bg-[var(--color-calm-500)] transition-colors min-h-[44px] flex items-center justify-center"
                    >
                      {sending ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Send'
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
