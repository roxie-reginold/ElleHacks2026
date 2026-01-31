import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { useEffect, useState } from 'react';
import AlertButton from '../components/AlertButton/AlertButton';

interface LastSession {
  timeAgo: string;
  calmMinutes: number;
}

export default function Home() {
  const { user } = useUser();
  const [lastSession, setLastSession] = useState<LastSession | null>(null);

  useEffect(() => {
    // Load last session from localStorage
    const sessions = JSON.parse(localStorage.getItem('whisper-sessions') || '[]');
    if (sessions.length > 0) {
      const last = sessions[sessions.length - 1];
      const hoursAgo = Math.round((Date.now() - new Date(last.endedAt).getTime()) / (1000 * 60 * 60));
      setLastSession({
        timeAgo: hoursAgo < 1 ? 'Just now' : `${hoursAgo}h ago`,
        calmMinutes: last.calmMinutes || 0,
      });
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
      {/* Floating leaves animation (subtle) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-4 h-4 bg-[var(--color-calm-700)]/20 rounded-full"
            initial={{ 
              x: Math.random() * 100 + '%', 
              y: -20,
              rotate: 0 
            }}
            animate={{ 
              y: '110vh',
              rotate: 360,
              x: `${Math.random() * 100}%`
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              delay: i * 3,
              ease: 'linear'
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-md">
        {/* Greeting */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[var(--text-muted)] text-lg mb-2"
        >
          Welcome back{user?.displayName ? `, ${user.displayName}` : ''}
        </motion.p>

        {/* Supportive message */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-medium text-[var(--text-primary)] mb-8"
        >
          You're safe. Breathe.
        </motion.h1>

        {/* Start Listening Button */}
        <Link to="/listen">
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative w-48 h-48 rounded-full bg-gradient-to-br from-[var(--color-calm-600)] to-[var(--color-calm-700)] text-white font-semibold text-xl shadow-lg shadow-[var(--color-calm-900)]/50 focus:outline-none focus:ring-4 focus:ring-[var(--color-calm-400)]/50"
            aria-label="Start listening to classroom audio"
          >
            {/* Pulsing ring */}
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-[var(--color-calm-400)]"
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-[var(--color-calm-400)]"
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.5,
              }}
            />
            <span className="relative z-10">Start Listening</span>
          </motion.button>
        </Link>

        {/* Last session info */}
        {lastSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 p-4 bg-[var(--bg-card)]/50 rounded-xl"
          >
            <p className="text-[var(--text-muted)] text-sm">
              Last session: {lastSession.timeAgo} • {lastSession.calmMinutes} min calm
            </p>
          </motion.div>
        )}

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex flex-col items-center gap-4"
        >
          <Link
            to="/dashboard"
            className="text-[var(--text-muted)] text-sm hover:text-[var(--text-secondary)] transition-colors underline-offset-2 hover:underline"
          >
            View your progress
          </Link>
          
          {/* Alert button for trusted adult */}
          <AlertButton />
        </motion.div>
      </div>
    </div>
  );
}
