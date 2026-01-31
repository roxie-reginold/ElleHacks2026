const API_BASE = import.meta.env.VITE_API_URL || '';

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
 * Get weekly dashboard data
 */
export async function getWeeklyDashboard(userId: string): Promise<DashboardResponse> {
  const response = await fetch(`${API_BASE}/api/dashboard/weekly?userId=${userId}`);

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

export default {
  analyzeAudio,
  generateRecap,
  getWeeklyDashboard,
  getProfile,
  updateProfile,
  sendAlert,
};
