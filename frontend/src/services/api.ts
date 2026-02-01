const API_BASE = import.meta.env.VITE_API_URL || '';

// ─────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────

interface AnalyzeResponse {
  detections: {
    overallState: 'calm' | 'stressor_detected' | 'unknown';
    events: Array<{
      t: number;
      type: string;
      confidence: number;
      note: string;
    }>;
  };
  suggestedPrompt: string;
  uiState: 'green' | 'amber';
  transcript?: string;
}

interface RecapResponse {
  summaryText: string;
  keyTerms: Array<{ term: string; explanation: string }>;
  audioUrl?: string;
}

interface DashboardResponse {
  stats: {
    totalSessions: number;
    calmMoments: number;
    triggersEncountered: number;
    breathingUsed: number;
    journalsSaved: number;
  };
  insights: Array<{
    text: string;
    type: 'positive' | 'neutral' | 'suggestion';
  }>;
  topTriggers: Array<{
    type: string;
    count: number;
  }>;
}

/** Response from GET /api/dashboard/weekly (real MongoDB + Gemini insights) */
export interface WeeklyDashboardApiResponse {
  period: { start: string; end: string };
  stats: {
    totalEmotionLogs: number;
    totalWins: number;
    totalBreathingBreaks: number;
    averageStressLevel: number;
  };
  patterns: {
    calmestTimeOfDay: string;
    mostStressfulContext: string;
    timeDistribution: { morning: number; afternoon: number; evening: number };
    contextPatterns: Record<string, number>;
  };
  moodDataByDay: { day: string; mood: number }[];
  topMood: string;
  insights: string[];
  suggestions: string[];
  recentEmotionLogs?: unknown[];
  recentWins?: unknown[];
}

interface ProfileData {
  _id?: string;
  displayName: string;
  ageRange?: '13-15' | '16-19';
  pronouns?: string;
  readingLevelGrade: number;
  sensitivity: 'low' | 'med' | 'high';
  trustedAdult?: {
    name: string;
    channel: 'sms' | 'email' | 'push';
    address: string;
  };
}

// ─────────────────────────────────────
// EMOTION TYPES
// ─────────────────────────────────────

export interface EmotionLog {
  _id?: string;
  userId: string;
  emoji: string;
  context?: string;
  stressLevel?: number;
  sessionId?: string;
  notes?: string;
  timestamp: Date;
}

export interface Win {
  _id?: string;
  userId: string;
  achievement: string;
  category: 'social' | 'academic' | 'emotional' | 'personal';
  sessionId?: string;
  timestamp: Date;
  weekNumber: number;
  year: number;
}

export interface WeeklyInsight {
  _id?: string;
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  insights: string[];
  suggestions: string[];
  stats: {
    totalEmotionLogs: number;
    totalWins: number;
    totalBreathingBreaks: number;
    averageStressLevel: number;
    calmestTimeOfDay: string;
    mostStressfulContext: string;
  };
}

// ─────────────────────────────────────
// AFFIRMATION TYPES
// ─────────────────────────────────────

export type AffirmationTrigger =
  | 'before_raising_hand'
  | 'group_work_starts'
  | 'stress_detected'
  | 'before_presentation'
  | 'post_class'
  | 'manual';

export interface Affirmation {
  _id?: string;
  userId: string;
  text: string;
  audioUrl: string;
  triggers: AffirmationTrigger[];
  isCustomVoice: boolean;
  timesPlayed: number;
  createdAt?: Date;
}

// ─────────────────────────────────────
// TEACHER REQUEST TYPES
// ─────────────────────────────────────

export type TeacherRequestType = 'need_help' | 'confused' | 'slow_down';

export interface TeacherRequest {
  _id?: string;
  studentId: string;
  teacherId?: string;
  requestType: TeacherRequestType;
  classSession?: string;
  resolved: boolean;
  resolvedAt?: Date;
  teacherNote?: string;
  timestamp: Date;
}

// ─────────────────────────────────────
// TTS TYPES
// ─────────────────────────────────────

export interface TTSResponse {
  success: boolean;
  audioPath?: string;
  characterCount?: number;
  requestId?: string;
  error?: string;
}

export interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

/**
 * Analyze audio for stress detection
 */
export async function analyzeAudio(
  userId: string,
  audioBlob: Blob | null,
  audioFile: File | null,
  transcript?: string
): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append('userId', userId);

  if (audioBlob) {
    formData.append('audio', audioBlob, 'recording.webm');
  } else if (audioFile) {
    formData.append('audio', audioFile);
  }

  if (transcript) {
    formData.append('transcript', transcript);
  }

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Analysis failed');
  }

  return response.json();
}

/**
 * Generate a recap from transcript
 */
export async function generateRecap(
  userId: string,
  sessionId: string,
  transcript: string,
  readingLevelGrade: number
): Promise<RecapResponse> {
  const response = await fetch(`${API_BASE}/api/recap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      sessionId,
      transcript,
      readingLevelGrade,
    }),
  });

  if (!response.ok) {
    throw new Error('Recap generation failed');
  }

  return response.json();
}

/**
 * Get weekly dashboard data (MongoDB emotion logs + Gemini insights)
 */
export async function getWeeklyDashboard(userId: string, weekOffset?: number): Promise<WeeklyDashboardApiResponse> {
  const params = new URLSearchParams({ userId });
  if (weekOffset != null) params.set('weekOffset', String(weekOffset));
  const response = await fetch(`${API_BASE}/api/dashboard/weekly?${params}`);

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard');
  }

  return response.json();
}

/**
 * Get user profile
 */
export async function getProfile(userId: string): Promise<ProfileData> {
  const response = await fetch(`${API_BASE}/api/profile/${userId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return response.json();
}

/**
 * Update user profile
 */
export async function updateProfile(profile: ProfileData): Promise<ProfileData> {
  const response = await fetch(`${API_BASE}/api/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw new Error('Failed to update profile');
  }

  return response.json();
}

/**
 * Send alert to trusted adult
 */
export async function sendAlert(
  userId: string,
  message?: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/api/alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message }),
  });

  if (!response.ok) {
    throw new Error('Failed to send alert');
  }

  return response.json();
}

/**
 * Delete user profile and all associated data
 */
export async function deleteProfile(userId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/api/profile/${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete profile');
  }

  return response.json();
}

/**
 * Increment focus moments counter
 */
export async function incrementFocusMoments(userId: string): Promise<ProfileData> {
  const response = await fetch(`${API_BASE}/api/profile/${userId}/focus-moments`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    throw new Error('Failed to increment focus moments');
  }

  return response.json();
}

// ─────────────────────────────────────
// EMOTIONS API
// ─────────────────────────────────────

/**
 * Log an emotion check-in
 */
export async function logEmotion(
  userId: string,
  emoji: string,
  options?: {
    context?: string;
    stressLevel?: number;
    sessionId?: string;
    notes?: string;
  }
): Promise<EmotionLog> {
  const response = await fetch(`${API_BASE}/api/emotions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      emoji,
      ...options,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to log emotion');
  }

  return response.json();
}

/**
 * Get emotion logs for a user
 */
export async function getEmotionLogs(
  userId: string,
  options?: { days?: number; context?: string }
): Promise<EmotionLog[]> {
  const params = new URLSearchParams();
  if (options?.days) params.append('days', options.days.toString());
  if (options?.context) params.append('context', options.context);

  const url = `${API_BASE}/api/emotions/${userId}${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch emotion logs');
  }

  return response.json();
}

/**
 * Log a win
 */
export async function logWin(
  userId: string,
  achievement: string,
  category: Win['category'],
  sessionId?: string
): Promise<Win> {
  const response = await fetch(`${API_BASE}/api/emotions/wins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, achievement, category, sessionId }),
  });

  if (!response.ok) {
    throw new Error('Failed to log win');
  }

  return response.json();
}

/**
 * Get wins for a user (current week by default)
 */
export async function getWins(
  userId: string,
  category?: Win['category']
): Promise<Win[]> {
  const params = new URLSearchParams();
  if (category) params.append('category', category);

  const url = `${API_BASE}/api/emotions/wins/${userId}${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch wins');
  }

  return response.json();
}

/**
 * Get weekly insight for a user
 */
export async function getWeeklyInsight(userId: string): Promise<WeeklyInsight> {
  const response = await fetch(`${API_BASE}/api/emotions/insights/${userId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch weekly insight');
  }

  return response.json();
}

// ─────────────────────────────────────
// AFFIRMATIONS API (Courage Clips)
// ─────────────────────────────────────

/**
 * Save a new affirmation (courage clip)
 */
export async function saveAffirmation(
  userId: string,
  text: string,
  audioUrl: string,
  triggers: AffirmationTrigger[],
  isCustomVoice: boolean = true
): Promise<Affirmation> {
  const response = await fetch(`${API_BASE}/api/affirmations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, text, audioUrl, triggers, isCustomVoice }),
  });

  if (!response.ok) {
    throw new Error('Failed to save affirmation');
  }

  return response.json();
}

/**
 * Get all affirmations for a user
 */
export async function getAffirmations(userId: string): Promise<Affirmation[]> {
  const response = await fetch(`${API_BASE}/api/affirmations/${userId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch affirmations');
  }

  return response.json();
}

/**
 * Get a random affirmation matching a trigger type
 */
export async function getAffirmationByTrigger(
  userId: string,
  triggerType: AffirmationTrigger
): Promise<Affirmation | null> {
  const response = await fetch(`${API_BASE}/api/affirmations/${userId}/trigger/${triggerType}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch affirmation for trigger');
  }

  return response.json();
}

/**
 * Increment the times played counter for an affirmation
 */
export async function markAffirmationPlayed(
  affirmationId: string
): Promise<{ timesPlayed: number }> {
  const response = await fetch(`${API_BASE}/api/affirmations/${affirmationId}/played`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    throw new Error('Failed to update play count');
  }

  return response.json();
}

/**
 * Delete an affirmation
 */
export async function deleteAffirmation(
  affirmationId: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/api/affirmations/${affirmationId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete affirmation');
  }

  return response.json();
}

// ─────────────────────────────────────
// TEACHER REQUESTS API
// ─────────────────────────────────────

/**
 * Send a request to the teacher (anonymous signal)
 */
export async function sendTeacherRequest(
  studentId: string,
  requestType: TeacherRequestType,
  options?: { teacherId?: string; classSession?: string }
): Promise<TeacherRequest> {
  const response = await fetch(`${API_BASE}/api/teacher-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId,
      requestType,
      ...options,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send teacher request');
  }

  return response.json();
}

/**
 * Get a student's past requests
 */
export async function getStudentRequests(studentId: string): Promise<TeacherRequest[]> {
  const response = await fetch(`${API_BASE}/api/teacher-requests/student/${studentId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch student requests');
  }

  return response.json();
}

// ─────────────────────────────────────
// TEXT-TO-SPEECH API
// ─────────────────────────────────────

/**
 * Convert text to speech
 */
export async function textToSpeech(
  text: string,
  options?: {
    voiceId?: string;
    stability?: number;
    similarityBoost?: number;
    modelId?: string;
  }
): Promise<TTSResponse> {
  const response = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, ...options }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'TTS failed' }));
    return { success: false, error: error.error || 'TTS failed' };
  }

  return response.json();
}

/**
 * Generate a calming prompt audio
 */
export async function generateCalmingAudio(prompt: string): Promise<TTSResponse> {
  const response = await fetch(`${API_BASE}/api/tts/calming`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Calming audio generation failed' }));
    return { success: false, error: error.error || 'Calming audio generation failed' };
  }

  return response.json();
}

/**
 * Get available TTS voices
 */
export async function getVoices(): Promise<Voice[]> {
  const response = await fetch(`${API_BASE}/api/tts/voices`);

  if (!response.ok) {
    throw new Error('Failed to fetch voices');
  }

  const data = await response.json();
  return data.voices || [];
}

/**
 * Get the URL for a generated audio file
 */
export function getAudioUrl(filename: string): string {
  return `${API_BASE}/api/tts/audio/${filename}`;
}

// ─────────────────────────────────────
// CONTEXT CLUES API
// ─────────────────────────────────────

export interface ContextClue {
  _id?: string;
  phrase: string;
  meaning: string;
  category: string;
  examples?: string[];
}

/**
 * Get all context clues or search
 */
export async function getContextClues(
  options?: { q?: string; category?: string }
): Promise<ContextClue[]> {
  const params = new URLSearchParams();
  if (options?.q) params.append('q', options.q);
  if (options?.category) params.append('category', options.category);

  const url = `${API_BASE}/api/context-clues${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch context clues');
  }

  return response.json();
}

/**
 * Search context clues by phrase or meaning
 */
export async function searchContextClues(query: string): Promise<ContextClue[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${API_BASE}/api/context-clues/search?${params}`);

  if (!response.ok) {
    throw new Error('Failed to search context clues');
  }

  return response.json();
}

// ─────────────────────────────────────
// RECAP API (Extended)
// ─────────────────────────────────────

/**
 * Get an existing recap by session ID
 */
export async function getRecapBySession(sessionId: string): Promise<RecapResponse | null> {
  const response = await fetch(`${API_BASE}/api/recap/${sessionId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch recap');
  }

  return response.json();
}

/**
 * Get all recaps for a user
 */
export async function getUserRecaps(userId: string): Promise<RecapResponse[]> {
  const response = await fetch(`${API_BASE}/api/recap/user/${userId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch user recaps');
  }

  return response.json();
}

// ─────────────────────────────────────
// DASHBOARD API (Extended)
// ─────────────────────────────────────

/**
 * Get dashboard trends across multiple weeks
 */
export async function getDashboardTrends(userId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/dashboard/trends?userId=${userId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard trends');
  }

  return response.json();
}

/**
 * Get details for a specific session
 */
export async function getSessionDetails(sessionId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/dashboard/session/${sessionId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch session details');
  }

  return response.json();
}

export default {
  // Analyze
  analyzeAudio,
  // Recap
  generateRecap,
  getRecapBySession,
  getUserRecaps,
  // Dashboard
  getWeeklyDashboard,
  getDashboardTrends,
  getSessionDetails,
  // Profile
  getProfile,
  updateProfile,
  deleteProfile,
  incrementFocusMoments,
  // Alert
  sendAlert,
  // Emotions
  logEmotion,
  getEmotionLogs,
  logWin,
  getWins,
  getWeeklyInsight,
  // Affirmations
  saveAffirmation,
  getAffirmations,
  getAffirmationByTrigger,
  markAffirmationPlayed,
  deleteAffirmation,
  // Teacher Requests
  sendTeacherRequest,
  getStudentRequests,
  // TTS
  textToSpeech,
  generateCalmingAudio,
  getVoices,
  getAudioUrl,
  // Context Clues
  getContextClues,
  searchContextClues,
};
