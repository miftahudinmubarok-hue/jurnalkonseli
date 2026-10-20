import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { getStorageDriver } from './server/driveStorage.ts';
import {
  scanEntryForSafetyRisks,
  computeKonseliAlertBadges,
} from './server/ruleAlerts.ts';
import { runWeeklyGeminiAnalysis } from './server/geminiAnalysis.ts';
import type {
  DailyJournalEntry,
  KonseliSummary,
  UserProfile,
  WeeklyAnalysisRecord,
} from './src/types/journal.ts';

dotenv.config();

const app = express();
const isProd = process.env.NODE_ENV === 'production';
const PORT = isProd ? (Number(process.env.PORT) || 8080) : 3000;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'MiftahudinMubarok@gmail.com').toLowerCase();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const oauthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const storage = getStorageDriver();

app.use(express.json({ limit: '10mb' }));

// In-memory sessions token store
const sessionStore: Map<string, UserProfile> = new Map();

// Helper: resolve user role
async function resolveUserProfile(email: string, name: string, picture?: string): Promise<UserProfile> {
  const normEmail = email.toLowerCase().trim();
  const config = await storage.getConfig();
  const isAdmin = normEmail === ADMIN_EMAIL;
  const isCounselor = isAdmin || config.counselorEmails.map((e) => e.toLowerCase()).includes(normEmail);

  return {
    email: normEmail,
    name: name || normEmail.split('@')[0],
    picture: picture || '',
    role: isCounselor ? 'konselor' : 'konseli',
    isAdmin,
    consentGivenAt: config.consentTimestamps[normEmail] || null,
  };
}

// Auth Middleware: extracts user from Bearer session token
async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Tidak terotentikasi. Silakan login kembali.' });
    return;
  }

  const token = authHeader.substring(7).trim();
  const cachedUser = sessionStore.get(token);

  if (cachedUser) {
    // Refresh role & consent status from storage
    const refreshed = await resolveUserProfile(cachedUser.email, cachedUser.name, cachedUser.picture);
    sessionStore.set(token, refreshed);
    (req as any).user = refreshed;
    next();
    return;
  }

  res.status(401).json({ error: 'Sesi login tidak valid atau telah kedaluwarsa. Silakan masuk kembali.' });
}

// Require Counselor Role
function requireCounselor(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as UserProfile;
  if (!user || user.role !== 'konselor') {
    res.status(403).json({ error: 'Akses ditolak. Halaman khusus konselor.' });
    return;
  }
  next();
}

// Require Admin
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as UserProfile;
  if (!user || !user.isAdmin) {
    res.status(403).json({ error: 'Akses ditolak. Khusus administrator.' });
    return;
  }
  next();
}

// --- API ROUTES ---

// 1. Status & Config
app.get('/api/status', async (_req: Request, res: Response) => {
  try {
    const config = await storage.getConfig();
    const driveStatus = storage.getDriveStatus();
    res.json({
      appName: 'Jurnal Harian Konseli',
      storageMode: storage.getStorageMode(),
      isDriveConfigured: driveStatus.isConfigured,
      isDriveConnected: driveStatus.isConnected,
      driveErrorMessage: driveStatus.errorMessage || null,
      serviceAccountEmail: driveStatus.serviceAccountEmail || null,
      googleClientId: GOOGLE_CLIENT_ID || null,
      isGeminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      adminEmail: ADMIN_EMAIL,
      emergencySettings: config.emergencySettings,
      alertThresholds: config.alertThresholds,
    });
  } catch (err: any) {
    console.error('Error in /api/status:', err);
    res.status(500).json({ error: 'Gagal memuat status aplikasi: ' + err.message });
  }
});

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const check = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return check === hash;
}

// 2. Auth: Manual Registration
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, name, password, role } = req.body;
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Format alamat email tidak valid.' });
      return;
    }
    if (!name || name.trim().length < 2) {
      res.status(400).json({ error: 'Nama lengkap minimal 2 karakter.' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
      return;
    }

    const normEmail = email.toLowerCase().trim();
    const config = await storage.getConfig();
    config.accounts = config.accounts || [];

    if (config.accounts.some((a) => a.email.toLowerCase() === normEmail)) {
      res.status(400).json({ error: 'Alamat email ini sudah terdaftar. Silakan login langsung.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const chosenRole: any =
      normEmail === ADMIN_EMAIL ? 'konselor' : role === 'konselor' ? 'konselor' : 'konseli';

    config.accounts.push({
      email: normEmail,
      name: name.trim(),
      passwordHash,
      salt,
      role: chosenRole,
      createdAt: new Date().toISOString(),
    });

    if (chosenRole === 'konselor' && !config.counselorEmails.map((e) => e.toLowerCase()).includes(normEmail)) {
      config.counselorEmails.push(normEmail);
    }

    await storage.saveConfig(config);

    const userProfile = await resolveUserProfile(normEmail, name.trim());
    const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStore.set(sessionToken, userProfile);

    res.json({
      token: sessionToken,
      user: userProfile,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Gagal mendaftar akun: ' + (err.message || 'Kesalahan server') });
  }
});

// 3. Auth: Manual Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
      return;
    }

    const normEmail = email.toLowerCase().trim();
    const config = await storage.getConfig();
    config.accounts = config.accounts || [];

    const account = config.accounts.find((a) => a.email.toLowerCase() === normEmail);

    if (account) {
      if (!verifyPassword(password, account.passwordHash, account.salt)) {
        res.status(401).json({ error: 'Kata sandi tidak sesuai. Silakan periksa kembali.' });
        return;
      }
      const userProfile = await resolveUserProfile(normEmail, account.name);
      const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStore.set(sessionToken, userProfile);
      res.json({ token: sessionToken, user: userProfile });
      return;
    }

    res.status(401).json({ error: 'Akun belum terdaftar. Silakan pilih tab "Daftar Akun Baru" di atas.' });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Gagal masuk: ' + (err.message || 'Kesalahan server') });
  }
});

// 4. Auth: Google ID Token or Demo Login
app.post('/api/auth/verify', async (req: Request, res: Response) => {
  try {
    const { idToken, demoUser } = req.body;

    let email = '';
    let name = '';
    let picture = '';

    if (idToken && oauthClient && GOOGLE_CLIENT_ID) {
      const ticket = await oauthClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        res.status(400).json({ error: 'Token Google tidak valid.' });
        return;
      }
      email = payload.email;
      name = payload.name || payload.email.split('@')[0];
      picture = payload.picture || '';
    } else {
      res.status(400).json({ error: 'Kredensial login Google tidak ditemukan.' });
      return;
    }

    const userProfile = await resolveUserProfile(email, name, picture);
    const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStore.set(sessionToken, userProfile);

    res.json({
      token: sessionToken,
      user: userProfile,
    });
  } catch (err: any) {
    console.error('Auth verification error:', err);
    res.status(401).json({ error: 'Gagal memverifikasi identitas: ' + (err.message || 'Error tidak diketahui') });
  }
});

// 3. User info
app.get('/api/auth/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});

// 4. Informed Consent
app.post('/api/consent', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const config = await storage.getConfig();
  const timestamp = new Date().toISOString();
  config.consentTimestamps[user.email] = timestamp;
  await storage.saveConfig(config);

  user.consentGivenAt = timestamp;
  res.json({ success: true, consentGivenAt: timestamp });
});

// 5. Get entry by date
app.get('/api/entries/:date', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const { date } = req.params;
  const targetEmail = user.role === 'konselor' && req.query.email ? String(req.query.email) : user.email;

  const entry = await storage.getEntry(targetEmail, date);
  res.json({ entry });
});

// 6. Save or update entry
app.post('/api/entries/:date', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const { date } = req.params;
  const entryData = req.body as Partial<DailyJournalEntry>;

  // Security: Konseli can only edit their own entries
  const targetEmail = user.email;

  // Run safety rule scanning
  const candidateEntry: DailyJournalEntry = {
    date,
    userEmail: targetEmail,
    userName: user.name,
    status: entryData.status === 'submitted' ? 'submitted' : 'draft',
    submittedAt: entryData.status === 'submitted' ? new Date().toISOString() : entryData.submittedAt,
    updatedAt: new Date().toISOString(),
    safetyFlag: false,
    safetyFlagReasons: [],
    moodCheckIn: entryData.moodCheckIn || {
      moodMorning: 5,
      moodAfternoon: 5,
      moodEvening: 5,
      dominantEmotions: [],
      moodNote: '',
    },
    grounding: entryData.grounding || { logs: [] },
    breathing: entryData.breathing || { logs: [] },
    symptoms: entryData.symptoms || { items: [], patternsNoticed: '' },
    thoughts: entryData.thoughts || { items: [] },
    sleepHabits: entryData.sleepHabits || {
      sleepTime: '23:00',
      wakeTime: '07:00',
      durationHours: 8,
      frequentAwakening: false,
      sleepQuality: 7,
      caffeine: '',
      exerciseMinutes: 0,
      regularMeals: true,
    },
    safety: entryData.safety || { items: [] },
  };

  const safetyScan = scanEntryForSafetyRisks(candidateEntry);
  candidateEntry.safetyFlag = safetyScan.isCritical;
  candidateEntry.safetyFlagReasons = safetyScan.reasons;

  await storage.saveEntry(targetEmail, candidateEntry);

  res.json({
    success: true,
    entry: candidateEntry,
    safetyAlertTriggered: safetyScan.isCritical,
    safetyAlertReasons: safetyScan.reasons,
  });
});

// 7. List entries for user
app.get('/api/entries', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const targetEmail = user.role === 'konselor' && req.query.email ? String(req.query.email) : user.email;

  const entries = await storage.listEntriesForKonseli(targetEmail);
  res.json({ entries });
});

// 8. Konseli Export Data (JSON)
app.get('/api/konseli/export', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const entries = await storage.listEntriesForKonseli(user.email);
  const analyses = await storage.listWeeklyAnalysesForKonseli(user.email);
  const sharedAnalyses = analyses.filter((a) => a.sharedWithClient);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="jurnal-konseling-${user.email}-${new Date().toISOString().split('T')[0]}.json"`
  );
  res.json({
    exportedAt: new Date().toISOString(),
    profile: user,
    entries,
    sharedAnalyses,
  });
});

// 9. Counselor: List all konseli with status, mood trend, and rule alerts
app.get('/api/konselor/konseli', authMiddleware, requireCounselor, async (_req: Request, res: Response) => {
  const emails = await storage.listAllKonseliEmails();
  const config = await storage.getConfig();
  const now = new Date();

  const summaries: KonseliSummary[] = [];

  for (const email of emails) {
    // Exclude counselors from konseli triage
    if (config.counselorEmails.map((e) => e.toLowerCase()).includes(email.toLowerCase())) {
      continue;
    }

    const entries = await storage.listEntriesForKonseli(email);
    const analyses = await storage.listWeeklyAnalysesForKonseli(email);
    const latestAnalysis = analyses.length > 0 ? analyses[analyses.length - 1] : undefined;

    // Calculate 7-day average mood
    const recentEntries = entries.slice(0, 7);
    let avgMood7Days = 0;
    if (recentEntries.length > 0) {
      const sum = recentEntries.reduce((acc, e) => {
        const m =
          ((e.moodCheckIn?.moodMorning ?? 5) +
            (e.moodCheckIn?.moodAfternoon ?? 5) +
            (e.moodCheckIn?.moodEvening ?? 5)) /
          3;
        return acc + m;
      }, 0);
      avgMood7Days = Number((sum / recentEntries.length).toFixed(1));
    }

    // Trend: compare recent 3 vs earlier 4
    let moodTrend: 'up' | 'down' | 'stable' = 'stable';
    if (recentEntries.length >= 4) {
      const recent3 =
        recentEntries.slice(0, 3).reduce((acc, e) => {
          return (
            acc +
            ((e.moodCheckIn?.moodMorning ?? 5) +
              (e.moodCheckIn?.moodAfternoon ?? 5) +
              (e.moodCheckIn?.moodEvening ?? 5)) /
              3
          );
        }, 0) / 3;
      const earlier =
        recentEntries.slice(3).reduce((acc, e) => {
          return (
            acc +
            ((e.moodCheckIn?.moodMorning ?? 5) +
              (e.moodCheckIn?.moodAfternoon ?? 5) +
              (e.moodCheckIn?.moodEvening ?? 5)) /
              3
          );
        }, 0) /
        recentEntries.slice(3).length;

      if (recent3 - earlier > 0.5) moodTrend = 'up';
      else if (earlier - recent3 > 0.5) moodTrend = 'down';
    }

    const activeAlerts = computeKonseliAlertBadges(entries, now);

    // Attention level
    let attentionLevel: 'rendah' | 'sedang' | 'tinggi' | 'segera' = 'rendah';
    if (activeAlerts.some((a) => a.severity === 'urgent')) {
      attentionLevel = 'segera';
    } else if (activeAlerts.some((a) => a.severity === 'warning') || avgMood7Days < 4) {
      attentionLevel = 'tinggi';
    } else if (activeAlerts.some((a) => a.severity === 'info') || avgMood7Days < 6) {
      attentionLevel = 'sedang';
    }

    const lastEntryDate = entries.length > 0 ? entries[0].date : undefined;
    let daysSinceLastEntry = 999;
    if (lastEntryDate) {
      daysSinceLastEntry = Math.floor(
        (now.getTime() - new Date(lastEntryDate).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    const account = config.accounts?.find((a) => a.email.toLowerCase() === email.toLowerCase());
    const firstEntryName = entries.find((e) => e.userName)?.userName;
    const resolvedName = account?.name || firstEntryName || email.split('@')[0];

    summaries.push({
      email,
      name: resolvedName,
      consentGivenAt: config.consentTimestamps[email],
      lastEntryDate,
      totalEntries: entries.length,
      averageMood7Days: avgMood7Days,
      moodTrend,
      attentionLevel,
      activeAlerts,
      daysSinceLastEntry,
      latestWeeklyAnalysis: latestAnalysis
        ? {
            weekId: latestAnalysis.weekId,
            analyzedAt: latestAnalysis.analyzedAt,
            tingkat_perhatian: latestAnalysis.analysis.tingkat_perhatian,
            status: latestAnalysis.status,
          }
        : undefined,
    });
  }

  // Sort by priority (segera first, then tinggi, then sedang, then rendah)
  const priorityOrder = { segera: 0, tinggi: 1, sedang: 2, rendah: 3 };
  summaries.sort((a, b) => priorityOrder[a.attentionLevel] - priorityOrder[b.attentionLevel]);

  res.json({ konseli: summaries });
});

// 10. Counselor: Get full detail for single konseli
app.get('/api/konselor/konseli/:email/detail', authMiddleware, requireCounselor, async (req: Request, res: Response) => {
  const { email } = req.params;
  const entries = await storage.listEntriesForKonseli(email);
  const analyses = await storage.listWeeklyAnalysesForKonseli(email);
  const config = await storage.getConfig();

  res.json({
    email,
    consentGivenAt: config.consentTimestamps[email],
    entries,
    analyses,
  });
});

// 11. Counselor: Trigger AI Weekly Analysis
app.post('/api/konselor/analisis', authMiddleware, requireCounselor, async (req: Request, res: Response) => {
  try {
    const { email, weekId, startDate, endDate } = req.body;
    if (!email || !weekId || !startDate || !endDate) {
      res.status(400).json({ error: 'Parameter email, weekId, startDate, dan endDate wajib diisi.' });
      return;
    }

    const allEntries = await storage.listEntriesForKonseli(email);
    const weekEntries = allEntries.filter((e) => e.date >= startDate && e.date <= endDate);

    if (weekEntries.length === 0) {
      res.status(400).json({ error: `Tidak ditemukan entri jurnal konseli pada rentang ${startDate} s/d ${endDate}.` });
      return;
    }

    // Previous analysis for comparison
    const allAnalyses = await storage.listWeeklyAnalysesForKonseli(email);
    const prevAnalysis = allAnalyses.find((a) => a.weekId < weekId);

    const { analysis, statistics } = await runWeeklyGeminiAnalysis(
      email,
      weekId,
      startDate,
      endDate,
      weekEntries,
      prevAnalysis
    );

    const record: WeeklyAnalysisRecord = {
      weekId,
      startDate,
      endDate,
      userEmail: email,
      analyzedAt: new Date().toISOString(),
      status: 'draft',
      counselorNotes: '',
      sharedWithClient: false,
      modelUsed: 'gemini-3.8-flash',
      statistics,
      analysis,
    };

    await storage.saveWeeklyAnalysis(email, record);

    res.json({ success: true, analysisRecord: record });
  } catch (err: any) {
    console.error('Error generating weekly analysis:', err);
    res.status(500).json({ error: 'Gagal membuat analisis mingguan: ' + (err.message || 'Kesalahan server') });
  }
});

// 12. Counselor: Update Weekly Analysis (Notes, Status, Share to client)
app.patch('/api/konselor/analisis/:weekId', authMiddleware, requireCounselor, async (req: Request, res: Response) => {
  try {
    const { weekId } = req.params;
    const { email, counselorNotes, status, sharedWithClient } = req.body;

    const existing = await storage.getWeeklyAnalysis(email, weekId);
    if (!existing) {
      res.status(404).json({ error: 'Analisis mingguan tidak ditemukan.' });
      return;
    }

    if (counselorNotes !== undefined) existing.counselorNotes = counselorNotes;
    if (status !== undefined) existing.status = status;
    if (sharedWithClient !== undefined) {
      existing.sharedWithClient = sharedWithClient;
      if (sharedWithClient) existing.sharedAt = new Date().toISOString();
    }

    await storage.saveWeeklyAnalysis(email, existing);
    res.json({ success: true, analysisRecord: existing });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memperbarui analisis: ' + err.message });
  }
});

// 13. Konseli: View Shared Summary
app.get('/api/konseli/shared-analysis', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as UserProfile;
  const analyses = await storage.listWeeklyAnalysesForKonseli(user.email);
  const shared = analyses
    .filter((a) => a.sharedWithClient)
    .map((a) => ({
      weekId: a.weekId,
      startDate: a.startDate,
      endDate: a.endDate,
      sharedAt: a.sharedAt,
      ringkasan_untuk_konseli: a.analysis.ringkasan_untuk_konseli,
      kekuatan_dan_sumber_daya: a.analysis.kekuatan_dan_sumber_daya,
    }));

  res.json({ sharedAnalyses: shared });
});

// 14. Admin: User Management (Get counselors)
app.get('/api/admin/users', authMiddleware, requireAdmin, async (_req: Request, res: Response) => {
  const config = await storage.getConfig();
  res.json({
    adminEmail: ADMIN_EMAIL,
    counselorEmails: config.counselorEmails,
  });
});

// 15. Admin: Add counselor
app.post('/api/admin/counselors', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Format email konselor tidak valid.' });
    return;
  }
  const normEmail = email.toLowerCase().trim();
  const config = await storage.getConfig();
  if (!config.counselorEmails.includes(normEmail)) {
    config.counselorEmails.push(normEmail);
    await storage.saveConfig(config);
  }
  res.json({ success: true, counselorEmails: config.counselorEmails });
});

// 16. Admin: Remove counselor
app.delete('/api/admin/counselors/:email', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const { email } = req.params;
  const normEmail = email.toLowerCase().trim();
  if (normEmail === ADMIN_EMAIL) {
    res.status(400).json({ error: 'Email admin utama tidak dapat dihapus dari daftar konselor.' });
    return;
  }
  const config = await storage.getConfig();
  config.counselorEmails = config.counselorEmails.filter((e) => e.toLowerCase() !== normEmail);
  await storage.saveConfig(config);
  res.json({ success: true, counselorEmails: config.counselorEmails });
});

// 17. Emergency Config: Update
app.put('/api/config/emergency', authMiddleware, requireCounselor, async (req: Request, res: Response) => {
  const { emergencySettings, alertThresholds } = req.body;
  const config = await storage.getConfig();
  if (emergencySettings) config.emergencySettings = { ...config.emergencySettings, ...emergencySettings };
  if (alertThresholds) config.alertThresholds = { ...config.alertThresholds, ...alertThresholds };
  await storage.saveConfig(config);
  res.json({ success: true, config });
});

// Global error handler: always return JSON, never leak HTML error pages
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Express request error:', err);
  res.status(500).json({
    error: err?.message || 'Terjadi kesalahan internal pada server.',
  });
});

// Vite Middleware mounting (Dev) or Static serving (Prod)
async function startServer() {
  const distPath = path.resolve(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (isProd && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Jurnal Harian Konseli berjalan di port ${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch(console.error);
