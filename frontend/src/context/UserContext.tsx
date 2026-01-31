import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface TrustedAdult {
  name: string;
  channel: 'sms' | 'email' | 'push';
  address: string;
}

export type UserRole = 'student' | 'teacher';

export interface User {
  _id: string;
  displayName: string;
  ageRange: '13-15' | '16-19';
  pronouns?: string;
  readingLevelGrade: number;
  sensitivity: 'low' | 'med' | 'high';
  trustedAdult?: TrustedAdult;
  focusMoments: number;
  journalPrompts: string[];
  role?: UserRole;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  updatePreferences: (updates: Partial<User>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const DEFAULT_USER: User = {
  _id: 'demo-user',
  displayName: 'Friend',
  ageRange: '13-15',
  readingLevelGrade: 7,
  sensitivity: 'med',
  focusMoments: 0,
  journalPrompts: [],
  role: 'student',
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage or create default
    const savedUser = localStorage.getItem('whisper-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      setUser(DEFAULT_USER);
      localStorage.setItem('whisper-user', JSON.stringify(DEFAULT_USER));
    }
    setLoading(false);
  }, []);

  const updatePreferences = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('whisper-user', JSON.stringify(updatedUser));
    
    // Sync with backend if available
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });
    } catch {
      // Offline mode - changes saved locally
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, loading, updatePreferences }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
