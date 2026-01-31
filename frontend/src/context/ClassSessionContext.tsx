import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const STORAGE_KEY = 'calmspace-class-session';

export interface ClassSessionState {
  classSessionId: string;
  courseId: string;
}

const DEFAULT_SESSION: ClassSessionState = {
  classSessionId: 'Period 2 – Math',
  courseId: '',
};

interface ClassSessionContextType {
  classSessionId: string;
  courseId: string;
  setClassSession: (session: Partial<ClassSessionState>) => void;
}

const ClassSessionContext = createContext<ClassSessionContextType | undefined>(undefined);

export function ClassSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClassSessionState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ClassSessionState>;
        return {
          classSessionId: parsed.classSessionId ?? DEFAULT_SESSION.classSessionId,
          courseId: parsed.courseId ?? DEFAULT_SESSION.courseId,
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SESSION;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setClassSession = useCallback((updates: Partial<ClassSessionState>) => {
    setState((prev) => ({
      classSessionId: updates.classSessionId ?? prev.classSessionId,
      courseId: updates.courseId ?? prev.courseId,
    }));
  }, []);

  return (
    <ClassSessionContext.Provider
      value={{
        classSessionId: state.classSessionId,
        courseId: state.courseId,
        setClassSession,
      }}
    >
      {children}
    </ClassSessionContext.Provider>
  );
}

export function useClassSession() {
  const context = useContext(ClassSessionContext);
  if (context === undefined) {
    throw new Error('useClassSession must be used within a ClassSessionProvider');
  }
  return context;
}
