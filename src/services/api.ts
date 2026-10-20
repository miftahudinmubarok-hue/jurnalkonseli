import {
  CounselorConfig,
  DailyJournalEntry,
  KonseliSummary,
  UserProfile,
  WeeklyAnalysisRecord,
} from '../types/journal';

const TOKEN_KEY = 'jurnal_konseli_token';
const DRAFT_PREFIX = 'jurnal_draft_';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Local draft offline storage
export function getLocalDraft(date: string): Partial<DailyJournalEntry> | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${date}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalDraft(date: string, data: Partial<DailyJournalEntry>): void {
  try {
    localStorage.setItem(`${DRAFT_PREFIX}${date}`, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save local draft:', e);
  }
}

export function clearLocalDraft(date: string): void {
  localStorage.removeItem(`${DRAFT_PREFIX}${date}`);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    let errorMsg = `Permintaan gagal (${res.status})`;
    if (contentType.includes('application/json')) {
      try {
        const data = await res.json();
        if (data.error) errorMsg = data.error;
      } catch {}
    } else {
      const text = await res.text();
      if (text.includes('Insufficient permissions')) {
        errorMsg = 'Izin Google Drive tidak mencukupi untuk folder tersebut.';
      } else if (text.length > 0 && text.length < 250 && !text.includes('<!doctype')) {
        errorMsg = text.trim();
      }
    }
    throw new Error(errorMsg);
  }

  if (!contentType.includes('application/json')) {
    await res.text();
    throw new Error('Server sedang memulai atau merespons format tidak terduga.');
  }

  return res.json();
}

export const api = {
  // Status & Auth
  getStatus: () =>
    request<{
      appName: string;
      storageMode: 'google_drive' | 'local_demo';
      isDriveConfigured: boolean;
      isDriveConnected?: boolean;
      driveErrorMessage?: string | null;
      serviceAccountEmail?: string | null;
      googleClientId: string | null;
      isGeminiConfigured: boolean;
      adminEmail: string;
      emergencySettings: CounselorConfig['emergencySettings'];
      alertThresholds: CounselorConfig['alertThresholds'];
    }>('/api/status'),

  registerManual: (data: { email: string; name: string; password: string; role?: 'konseli' | 'konselor' }) =>
    request<{ token: string; user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  loginManual: (data: { email: string; password: string }) =>
    request<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyAuth: (payload: { idToken?: string; demoUser?: { email: string; name: string; picture?: string } }) =>
    request<{ token: string; user: UserProfile }>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCurrentUser: () => request<{ user: UserProfile }>('/api/auth/me'),

  submitConsent: () =>
    request<{ success: boolean; consentGivenAt: string }>('/api/consent', {
      method: 'POST',
    }),

  // Entries
  getEntryByDate: (date: string, email?: string) => {
    const url = email ? `/api/entries/${date}?email=${encodeURIComponent(email)}` : `/api/entries/${date}`;
    return request<{ entry: DailyJournalEntry | null }>(url);
  },

  saveEntry: (date: string, entry: Partial<DailyJournalEntry>) =>
    request<{
      success: boolean;
      entry: DailyJournalEntry;
      safetyAlertTriggered: boolean;
      safetyAlertReasons: string[];
    }>(`/api/entries/${date}`, {
      method: 'POST',
      body: JSON.stringify(entry),
    }),

  listEntries: (email?: string) => {
    const url = email ? `/api/entries?email=${encodeURIComponent(email)}` : '/api/entries';
    return request<{ entries: DailyJournalEntry[] }>(url);
  },

  exportMyData: async () => {
    const token = getStoredToken();
    const res = await fetch('/api/konseli/export', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Gagal mengunduh data');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jurnal-konseling-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  getSharedAnalysis: () =>
    request<{
      sharedAnalyses: Array<{
        weekId: string;
        startDate: string;
        endDate: string;
        sharedAt?: string;
        ringkasan_untuk_konseli?: string;
        kekuatan_dan_sumber_daya: string[];
      }>;
    }>('/api/konseli/shared-analysis'),

  // Counselor endpoints
  getCounselorKonseliList: () => request<{ konseli: KonseliSummary[] }>('/api/konselor/konseli'),

  getKonseliDetail: (email: string) =>
    request<{
      email: string;
      consentGivenAt?: string;
      entries: DailyJournalEntry[];
      analyses: WeeklyAnalysisRecord[];
    }>(`/api/konselor/konseli/${encodeURIComponent(email)}/detail`),

  generateWeeklyAnalysis: (email: string, weekId: string, startDate: string, endDate: string) =>
    request<{ success: boolean; analysisRecord: WeeklyAnalysisRecord }>('/api/konselor/analisis', {
      method: 'POST',
      body: JSON.stringify({ email, weekId, startDate, endDate }),
    }),

  updateWeeklyAnalysis: (
    weekId: string,
    email: string,
    data: { counselorNotes?: string; status?: 'draft' | 'approved'; sharedWithClient?: boolean }
  ) =>
    request<{ success: boolean; analysisRecord: WeeklyAnalysisRecord }>(
      `/api/konselor/analisis/${encodeURIComponent(weekId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ email, ...data }),
      }
    ),

  // Admin endpoints
  getAdminUsers: () => request<{ adminEmail: string; counselorEmails: string[] }>('/api/admin/users'),

  addCounselor: (email: string) =>
    request<{ success: boolean; counselorEmails: string[] }>('/api/admin/counselors', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  removeCounselor: (email: string) =>
    request<{ success: boolean; counselorEmails: string[] }>(
      `/api/admin/counselors/${encodeURIComponent(email)}`,
      {
        method: 'DELETE',
      }
    ),

  updateEmergencyConfig: (data: {
    emergencySettings?: CounselorConfig['emergencySettings'];
    alertThresholds?: CounselorConfig['alertThresholds'];
  }) =>
    request<{ success: boolean; config: CounselorConfig }>('/api/config/emergency', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
