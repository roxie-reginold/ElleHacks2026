import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { updateProfile as apiUpdateProfile, getProfile } from '../services/api';

export interface TrustedAdult {
  name: string;
  channel: 'sms' | 'email' | 'push';
  address: string;
}

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
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      // Load user from localStorage first
      const savedUser = localStorage.getItem('whisper-user');
      let localUser: User | null = null;
      
      if (savedUser) {
        localUser = JSON.parse(savedUser);
        setUser(localUser);
      }
      
      // Try to fetch from backend
      if (localUser?._id) {
        try {
          const backendUser = await getProfile(localUser._id);
          const mergedUser = { ...localUser, ...backendUser };
          setUser(mergedUser as User);
          localStorage.setItem('whisper-user', JSON.stringify(mergedUser));
        } catch {
          // Offline mode - use local data
        }
      } else if (!localUser) {
        // No local user, create default
        setUser(DEFAULT_USER);
        localStorage.setItem('whisper-user', JSON.stringify(DEFAULT_USER));
      }
      
      setLoading(false);
    };
    
    loadUser();
  }, []);

  const updatePreferences = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('whisper-user', JSON.stringify(updatedUser));
    
    // Sync with backend if available
    try {
      await apiUpdateProfile({
        _id: updatedUser._id,
        displayName: updatedUser.displayName,
        ageRange: updatedUser.ageRange,
        pronouns: updatedUser.pronouns,
        readingLevelGrade: updatedUser.readingLevelGrade,
        sensitivity: updatedUser.sensitivity,
        trustedAdult: updatedUser.trustedAdult,
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
