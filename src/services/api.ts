import {
  CounselorConfig,
  DailyJournalEntry,
  KonseliSummary,
  UserProfile,
  WeeklyAnalysisRecord,
} from '../types/journal';

const TOKEN_KEY = 'jurnal_konseli_token';
const USER_KEY = 'jurnal_active_user';
const ACCOUNTS_KEY = 'jurnal_local_accounts';
const CONFIG_KEY = 'jurnal_local_config';
const DRAFT_PREFIX = 'jurnal_draft_';
const ENTRY_PREFIX = 'jurnal_entry_';
const ENTRY_INDEX_PREFIX = 'jurnal_index_';

const DEFAULT_CONFIG: CounselorConfig = {
  counselorEmails: ['miftahudinmubarok@gmail.com'],
  consentTimestamps: {},
  emergencySettings: {
    emergencyNumber: '119',
    hotlineName: 'Layanan Kesehatan Jiwa Kemenkes (Sejiwa)',
    hotlineExtension: '8',
    nearestHospitalNote: 'Hubungi Instalasi Gawat Darurat (IGD) rumah sakit terdekat jika terjadi krisis berat.',
    counselorContact: '0812-3456-7890 (Pusat Konseling Jiwa Tenang)',
  },
  alertThresholds: {
    lowMoodThreshold: 2.5,
    lowMoodDays: 3,
    lowSleepHours: 4,
    lowSleepDays: 3,
    inactiveDays: 3,
    highWorryThreshold: 7,
  },
};

const RISK_KEYWORDS = [
  'menyakiti diri',
  'bunuh diri',
  'mengakhiri hidup',
  'ingin mati',
  'mati saja',
  'suicide',
  'self harm',
  'melukai diri',
  'tidak ingin hidup',
  'gantung diri',
  'minum racun',
  'loncat',
  'sayat tangan',
  'tidak kuat lagi hidup',
  'lebih baik mati',
  'akhiri semua',
];

interface LocalAccount {
  email: string;
  name: string;
  password: string;
  role: 'konseli' | 'konselor';
  isAdmin: boolean;
  consentGivenAt: string | null;
  createdAt: string;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

function getLocalActiveUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalActiveUser(user: UserProfile | null): void {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function getLocalAccounts(): LocalAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: LocalAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function getLocalConfig(): CounselorConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveLocalConfig(config: CounselorConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
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

class ApiError extends Error {
  isNotFound: boolean;
  constructor(message: string, isNotFound: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.isNotFound = isNotFound;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(endpoint, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new ApiError('Koneksi ke server terputus: ' + (netErr.message || 'Offline'), true);
  }

  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    let errorMsg = `Permintaan gagal (${res.status})`;
    let isNotFound = res.status === 404;

    if (contentType.includes('application/json')) {
      try {
        const data = await res.json();
        if (data.error) errorMsg = data.error;
      } catch {}
    } else {
      const text = await res.text();
      if (text.includes('NOT_FOUND') || text.includes('sin1::') || res.status === 404) {
        isNotFound = true;
        errorMsg = 'Layanan API server belum terhubung (404 Not Found).';
      } else if (text.includes('Insufficient permissions')) {
        errorMsg = 'Izin Google Drive tidak mencukupi untuk folder tersebut.';
      } else if (text.length > 0 && text.length < 250 && !text.includes('<!doctype')) {
        errorMsg = text.trim();
      }
    }
    throw new ApiError(errorMsg, isNotFound);
  }

  if (!contentType.includes('application/json')) {
    await res.text();
    throw new ApiError('Server sedang memulai atau merespons format tidak terduga.', true);
  }

  return res.json();
}

function runLocalSafetyScan(entry: Partial<DailyJournalEntry>): { isCritical: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (entry.safety?.items && entry.safety.items.length > 0) {
    for (const item of entry.safety.items) {
      if (item.worryLevel >= 7) {
        reasons.push(`Catatan keselamatan terisi dengan tingkat kekhawatiran ${item.worryLevel}/10`);
      }
    }
  }

  const textCorpus = [
    entry.moodCheckIn?.moodNote,
    entry.symptoms?.patternsNoticed,
    ...(entry.grounding?.logs || []).map((l) => l.noticed),
    ...(entry.breathing?.logs || []).map((l) => `${l.perceivedChanges} ${l.notes}`),
    ...(entry.symptoms?.items || []).map(
      (s) => `${s.symptom} ${s.triggerSituation} ${s.actionTaken} ${s.whatHelped}`
    ),
    ...(entry.thoughts?.items || []).map(
      (t) => `${t.situation} ${t.automaticThoughts} ${t.emotions} ${t.bodyReaction} ${t.alternativePerspective}`
    ),
    ...(entry.safety?.items || []).map((s) => `${s.whatHappened} ${s.actionTaken} ${s.contactedWhom}`),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const kw of RISK_KEYWORDS) {
    if (textCorpus.includes(kw)) {
      reasons.push(`Terdeteksi kata kunci risiko: "${kw}"`);
    }
  }

  return {
    isCritical: reasons.length > 0,
    reasons,
  };
}

export const api = {
  // Status & Auth
  getStatus: async () => {
    try {
      return await request<{
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
      }>('/api/status');
    } catch (err: any) {
      const config = getLocalConfig();
      return {
        appName: 'Jurnal Harian Konseli',
        storageMode: 'local_demo' as const,
        isDriveConfigured: false,
        isDriveConnected: false,
        driveErrorMessage: null,
        serviceAccountEmail: null,
        googleClientId: null,
        isGeminiConfigured: false,
        adminEmail: 'miftahudinmubarok@gmail.com',
        emergencySettings: config.emergencySettings,
        alertThresholds: config.alertThresholds,
      };
    }
  },

  registerManual: async (data: {
    email: string;
    name: string;
    password: string;
    role?: 'konseli' | 'konselor';
  }) => {
    try {
      return await request<{ token: string; user: UserProfile }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      // If server route not found or unreachable, save locally seamlessly
      if (err instanceof ApiError && err.isNotFound) {
        const normEmail = data.email.toLowerCase().trim();
        const accounts = getLocalAccounts();
        if (accounts.some((a) => a.email === normEmail)) {
          throw new Error('Alamat email ini sudah terdaftar. Silakan login langsung.');
        }

        const isAdmin = normEmail === 'miftahudinmubarok@gmail.com';
        const role = isAdmin ? 'konselor' : data.role || 'konseli';

        const newAccount: LocalAccount = {
          email: normEmail,
          name: data.name.trim(),
          password: data.password,
          role,
          isAdmin,
          consentGivenAt: null,
          createdAt: new Date().toISOString(),
        };

        accounts.push(newAccount);
        saveLocalAccounts(accounts);

        const user: UserProfile = {
          email: normEmail,
          name: newAccount.name,
          picture: '',
          role: newAccount.role,
          isAdmin: newAccount.isAdmin,
          consentGivenAt: null,
        };

        const token = `sess_local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        setStoredToken(token);
        setLocalActiveUser(user);

        return { token, user };
      }
      throw err;
    }
  },

  loginManual: async (data: { email: string; password: string }) => {
    try {
      return await request<{ token: string; user: UserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.isNotFound) {
        const normEmail = data.email.toLowerCase().trim();
        const accounts = getLocalAccounts();
        const account = accounts.find((a) => a.email === normEmail);

        if (account) {
          if (account.password !== data.password) {
            throw new Error('Kata sandi tidak sesuai. Silakan periksa kembali.');
          }
          const user: UserProfile = {
            email: account.email,
            name: account.name,
            picture: '',
            role: account.role,
            isAdmin: account.isAdmin,
            consentGivenAt: account.consentGivenAt,
          };
          const token = `sess_local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          setStoredToken(token);
          setLocalActiveUser(user);
          return { token, user };
        }

        if (normEmail === 'miftahudinmubarok@gmail.com') {
          const adminAccount: LocalAccount = {
            email: normEmail,
            name: 'Konselor Utama',
            password: data.password,
            role: 'konselor',
            isAdmin: true,
            consentGivenAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };
          accounts.push(adminAccount);
          saveLocalAccounts(accounts);

          const user: UserProfile = {
            email: normEmail,
            name: adminAccount.name,
            picture: '',
            role: 'konselor',
            isAdmin: true,
            consentGivenAt: adminAccount.consentGivenAt,
          };
          const token = `sess_local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          setStoredToken(token);
          setLocalActiveUser(user);
          return { token, user };
        }

        throw new Error('Akun belum terdaftar. Silakan pilih tab "Buat Akun Baru" di atas.');
      }
      throw err;
    }
  },

  verifyAuth: (payload: { idToken?: string; demoUser?: { email: string; name: string; picture?: string } }) =>
    request<{ token: string; user: UserProfile }>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCurrentUser: async () => {
    try {
      return await request<{ user: UserProfile }>('/api/auth/me');
    } catch (err: any) {
      const localUser = getLocalActiveUser();
      if (localUser) {
        return { user: localUser };
      }
      throw err;
    }
  },

  submitConsent: async () => {
    try {
      return await request<{ success: boolean; consentGivenAt: string }>('/api/consent', {
        method: 'POST',
      });
    } catch (err: any) {
      const now = new Date().toISOString();
      const localUser = getLocalActiveUser();
      if (localUser) {
        localUser.consentGivenAt = now;
        setLocalActiveUser(localUser);

        const accounts = getLocalAccounts();
        const idx = accounts.findIndex((a) => a.email === localUser.email);
        if (idx !== -1) {
          accounts[idx].consentGivenAt = now;
          saveLocalAccounts(accounts);
        }
      }
      return { success: true, consentGivenAt: now };
    }
  },

  // Entries
  getEntryByDate: async (date: string, email?: string) => {
    try {
      const url = email ? `/api/entries/${date}?email=${encodeURIComponent(email)}` : `/api/entries/${date}`;
      return await request<{ entry: DailyJournalEntry | null }>(url);
    } catch (err: any) {
      const targetEmail = email || getLocalActiveUser()?.email;
      if (!targetEmail) return { entry: null };
      const raw = localStorage.getItem(`${ENTRY_PREFIX}${targetEmail}_${date}`);
      return { entry: raw ? JSON.parse(raw) : null };
    }
  },

  saveEntry: async (date: string, entry: Partial<DailyJournalEntry>) => {
    try {
      return await request<{
        success: boolean;
        entry: DailyJournalEntry;
        safetyAlertTriggered: boolean;
        safetyAlertReasons: string[];
      }>(`/api/entries/${date}`, {
        method: 'POST',
        body: JSON.stringify(entry),
      });
    } catch (err: any) {
      const activeUser = getLocalActiveUser();
      const targetEmail = activeUser?.email || 'konseli@example.com';
      const scan = runLocalSafetyScan(entry);
      const nowIso = new Date().toISOString();

      const savedEntry: DailyJournalEntry = {
        date,
        userEmail: targetEmail,
        userName: activeUser?.name,
        status: entry.status || 'draft',
        submittedAt: entry.submittedAt,
        updatedAt: nowIso,
        safetyFlag: scan.isCritical,
        safetyFlagReasons: scan.reasons,
        moodCheckIn: entry.moodCheckIn || {
          moodMorning: 5,
          moodAfternoon: 5,
          moodEvening: 5,
          dominantEmotions: [],
          moodNote: '',
        },
        grounding: entry.grounding || { logs: [] },
        breathing: entry.breathing || { logs: [] },
        symptoms: entry.symptoms || { items: [], patternsNoticed: '' },
        thoughts: entry.thoughts || { items: [] },
        sleepHabits: entry.sleepHabits || {
          sleepTime: '23:00',
          wakeTime: '06:30',
          durationHours: 7.5,
          frequentAwakening: false,
          sleepQuality: 7,
          caffeine: '',
          exerciseMinutes: 0,
          regularMeals: true,
        },
        safety: entry.safety || { items: [] },
      };

      localStorage.setItem(`${ENTRY_PREFIX}${targetEmail}_${date}`, JSON.stringify(savedEntry));

      // Update index
      try {
        const indexKey = `${ENTRY_INDEX_PREFIX}${targetEmail}`;
        const rawIndex = localStorage.getItem(indexKey);
        const dates: string[] = rawIndex ? JSON.parse(rawIndex) : [];
        if (!dates.includes(date)) {
          dates.push(date);
          dates.sort();
          localStorage.setItem(indexKey, JSON.stringify(dates));
        }
      } catch {}

      clearLocalDraft(date);

      return {
        success: true,
        entry: savedEntry,
        safetyAlertTriggered: scan.isCritical,
        safetyAlertReasons: scan.reasons,
      };
    }
  },

  listEntries: async (email?: string) => {
    try {
      const url = email ? `/api/entries?email=${encodeURIComponent(email)}` : '/api/entries';
      return await request<{ entries: DailyJournalEntry[] }>(url);
    } catch (err: any) {
      const targetEmail = email || getLocalActiveUser()?.email;
      if (!targetEmail) return { entries: [] };

      const indexKey = `${ENTRY_INDEX_PREFIX}${targetEmail}`;
      const rawIndex = localStorage.getItem(indexKey);
      const dates: string[] = rawIndex ? JSON.parse(rawIndex) : [];

      const entries: DailyJournalEntry[] = [];
      for (const d of dates) {
        const raw = localStorage.getItem(`${ENTRY_PREFIX}${targetEmail}_${d}`);
        if (raw) {
          try {
            entries.push(JSON.parse(raw));
          } catch {}
        }
      }
      return { entries };
    }
  },

  exportMyData: async () => {
    try {
      const token = getStoredToken();
      const res = await fetch('/api/konseli/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jurnal-konseling-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }
    } catch {}

    // Fallback export from local storage
    const activeUser = getLocalActiveUser();
    const listRes = await api.listEntries();
    const exportData = {
      user: activeUser,
      exportDate: new Date().toISOString(),
      entriesCount: listRes.entries.length,
      entries: listRes.entries,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
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
    }>('/api/konseli/shared-analysis').catch(() => ({ sharedAnalyses: [] })),

  // Counselor endpoints
  getCounselorKonseliList: async () => {
    try {
      return await request<{ konseli: KonseliSummary[] }>('/api/konselor/konseli');
    } catch (err: any) {
      const accounts = getLocalAccounts();
      const konseliAccounts = accounts.filter((a) => a.role === 'konseli');
      const konseliSummaries: KonseliSummary[] = [];

      for (const k of konseliAccounts) {
        const entriesRes = await api.listEntries(k.email);
        const entries = entriesRes.entries;
        const totalEntries = entries.length;
        const lastEntry = entries[entries.length - 1];

        konseliSummaries.push({
          email: k.email,
          name: k.name,
          consentGivenAt: k.consentGivenAt || undefined,
          lastEntryDate: lastEntry ? lastEntry.date : undefined,
          totalEntries,
          averageMood7Days: 5,
          moodTrend: 'stable',
          attentionLevel: lastEntry?.safetyFlag ? 'segera' : 'rendah',
          activeAlerts: lastEntry?.safetyFlag
            ? [
                {
                  type: 'safety_worry',
                  severity: 'urgent',
                  message: lastEntry.safetyFlagReasons?.join('; ') || 'Catatan keselamatan terdeteksi',
                  detectedAtDate: lastEntry.date,
                },
              ]
            : [],
          daysSinceLastEntry: 0,
        });
      }

      return { konseli: konseliSummaries };
    }
  },

  getKonseliDetail: async (email: string) => {
    try {
      return await request<{
        email: string;
        consentGivenAt?: string;
        entries: DailyJournalEntry[];
        analyses: WeeklyAnalysisRecord[];
      }>(`/api/konselor/konseli/${encodeURIComponent(email)}/detail`);
    } catch (err: any) {
      const accounts = getLocalAccounts();
      const account = accounts.find((a) => a.email === email);
      const entriesRes = await api.listEntries(email);
      return {
        email,
        consentGivenAt: account?.consentGivenAt || undefined,
        entries: entriesRes.entries,
        analyses: [],
      };
    }
  },

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
  getAdminUsers: async () => {
    try {
      return await request<{ adminEmail: string; counselorEmails: string[] }>('/api/admin/users');
    } catch (err: any) {
      const config = getLocalConfig();
      return { adminEmail: 'miftahudinmubarok@gmail.com', counselorEmails: config.counselorEmails };
    }
  },

  addCounselor: async (email: string) => {
    try {
      return await request<{ success: boolean; counselorEmails: string[] }>('/api/admin/counselors', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch (err: any) {
      const config = getLocalConfig();
      const norm = email.toLowerCase().trim();
      if (!config.counselorEmails.includes(norm)) {
        config.counselorEmails.push(norm);
        saveLocalConfig(config);
      }
      return { success: true, counselorEmails: config.counselorEmails };
    }
  },

  removeCounselor: async (email: string) => {
    try {
      return await request<{ success: boolean; counselorEmails: string[] }>(
        `/api/admin/counselors/${encodeURIComponent(email)}`,
        {
          method: 'DELETE',
        }
      );
    } catch (err: any) {
      const config = getLocalConfig();
      const norm = email.toLowerCase().trim();
      config.counselorEmails = config.counselorEmails.filter((c) => c !== norm);
      saveLocalConfig(config);
      return { success: true, counselorEmails: config.counselorEmails };
    }
  },

  updateEmergencyConfig: async (data: {
    emergencySettings?: CounselorConfig['emergencySettings'];
    alertThresholds?: CounselorConfig['alertThresholds'];
  }) => {
    try {
      return await request<{ success: boolean; config: CounselorConfig }>('/api/config/emergency', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      const config = getLocalConfig();
      if (data.emergencySettings) {
        config.emergencySettings = { ...config.emergencySettings, ...data.emergencySettings };
      }
      if (data.alertThresholds) {
        config.alertThresholds = { ...config.alertThresholds, ...data.alertThresholds };
      }
      saveLocalConfig(config);
      return { success: true, config };
    }
  },
};
