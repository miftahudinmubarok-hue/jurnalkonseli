import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import type { CounselorConfig, DailyJournalEntry, WeeklyAnalysisRecord } from '../src/types/journal.ts';

export interface StorageDriver {
  isConfigured(): boolean;
  getStorageMode(): 'google_drive' | 'local_server' | 'local_demo';
  getDriveStatus(): {
    isConfigured: boolean;
    isConnected: boolean;
    errorMessage?: string;
    serviceAccountEmail?: string;
  };
  getConfig(): Promise<CounselorConfig>;
  saveConfig(config: CounselorConfig): Promise<void>;
  getEntry(email: string, date: string): Promise<DailyJournalEntry | null>;
  saveEntry(email: string, entry: DailyJournalEntry): Promise<void>;
  listEntriesForKonseli(email: string): Promise<DailyJournalEntry[]>;
  listAllKonseliEmails(): Promise<string[]>;
  getWeeklyAnalysis(email: string, weekId: string): Promise<WeeklyAnalysisRecord | null>;
  saveWeeklyAnalysis(email: string, analysis: WeeklyAnalysisRecord): Promise<void>;
  listWeeklyAnalysesForKonseli(email: string): Promise<WeeklyAnalysisRecord[]>;
}

const LOCAL_DATA_DIR = path.resolve(process.cwd(), '.data');

// Default initial configuration
const DEFAULT_CONFIG: CounselorConfig = {
  counselorEmails: [
    (process.env.ADMIN_EMAIL || 'MiftahudinMubarok@gmail.com').toLowerCase(),
  ],
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

/**
 * Local File Driver (Active for local server storage)
 */
export class LocalFileStorageDriver implements StorageDriver {
  private baseDir: string;

  constructor() {
    this.baseDir = LOCAL_DATA_DIR;
    this.ensureDir(this.baseDir);
    this.ensureDir(path.join(this.baseDir, '_config'));
    this.ensureDir(path.join(this.baseDir, 'konseli'));
    this.initDefaultSeed();
  }

  isConfigured(): boolean {
    return true;
  }

  getStorageMode(): 'local_server' {
    return 'local_server';
  }

  getDriveStatus() {
    return {
      isConfigured: false,
      isConnected: true,
      errorMessage: undefined,
    };
  }

  private ensureDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private initDefaultSeed() {
    const configPath = path.join(this.baseDir, '_config', 'users.json');
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    }
  }

  async getConfig(): Promise<CounselorConfig> {
    const configPath = path.join(this.baseDir, '_config', 'users.json');
    try {
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.error('Error reading local config:', err);
    }
    return DEFAULT_CONFIG;
  }

  async saveConfig(config: CounselorConfig): Promise<void> {
    const configPath = path.join(this.baseDir, '_config', 'users.json');
    this.ensureDir(path.dirname(configPath));
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  private sanitizeEmail(email: string): string {
    return email.toLowerCase().trim().replace(/[^a-z0-9@._-]/g, '_');
  }

  async getEntry(email: string, date: string): Promise<DailyJournalEntry | null> {
    const safeEmail = this.sanitizeEmail(email);
    const filePath = path.join(this.baseDir, 'konseli', safeEmail, 'entries', `${date}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to read entry:', e);
      }
    }
    return null;
  }

  async saveEntry(email: string, entry: DailyJournalEntry): Promise<void> {
    const safeEmail = this.sanitizeEmail(email);
    const dir = path.join(this.baseDir, 'konseli', safeEmail, 'entries');
    this.ensureDir(dir);
    const filePath = path.join(dir, `${entry.date}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
  }

  async listEntriesForKonseli(email: string): Promise<DailyJournalEntry[]> {
    const safeEmail = this.sanitizeEmail(email);
    const dir = path.join(this.baseDir, 'konseli', safeEmail, 'entries');
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const entries: DailyJournalEntry[] = [];
    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(dir, f), 'utf-8');
        entries.push(JSON.parse(content));
      } catch (err) {
        console.error('Error reading entry file:', f, err);
      }
    }
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }

  async listAllKonseliEmails(): Promise<string[]> {
    const emailsSet = new Set<string>();
    const konseliRoot = path.join(this.baseDir, 'konseli');
    if (fs.existsSync(konseliRoot)) {
      const dirs = fs
        .readdirSync(konseliRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      dirs.forEach((d) => emailsSet.add(d.toLowerCase()));
    }

    try {
      const config = await this.getConfig();
      if (config.accounts && Array.isArray(config.accounts)) {
        for (const acc of config.accounts) {
          const accEmail = acc.email.toLowerCase();
          if (acc.role !== 'konselor' && !config.counselorEmails.map((e) => e.toLowerCase()).includes(accEmail)) {
            emailsSet.add(accEmail);
          }
        }
      }
    } catch (e) {
      console.warn('Error reading accounts in listAllKonseliEmails:', e);
    }

    return Array.from(emailsSet);
  }

  async getWeeklyAnalysis(email: string, weekId: string): Promise<WeeklyAnalysisRecord | null> {
    const safeEmail = this.sanitizeEmail(email);
    const filePath = path.join(this.baseDir, 'konseli', safeEmail, 'analisis', `${weekId}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to read analysis:', e);
      }
    }
    return null;
  }

  async saveWeeklyAnalysis(email: string, analysis: WeeklyAnalysisRecord): Promise<void> {
    const safeEmail = this.sanitizeEmail(email);
    const dir = path.join(this.baseDir, 'konseli', safeEmail, 'analisis');
    this.ensureDir(dir);
    const filePath = path.join(dir, `${analysis.weekId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(analysis, null, 2), 'utf-8');
  }

  async listWeeklyAnalysesForKonseli(email: string): Promise<WeeklyAnalysisRecord[]> {
    const safeEmail = this.sanitizeEmail(email);
    const dir = path.join(this.baseDir, 'konseli', safeEmail, 'analisis');
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const records: WeeklyAnalysisRecord[] = [];
    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(dir, f), 'utf-8');
        records.push(JSON.parse(content));
      } catch (err) {
        console.error('Error reading analysis file:', f, err);
      }
    }
    return records.sort((a, b) => b.weekId.localeCompare(a.weekId));
  }
}

/**
 * Google Drive API v3 Storage Driver with automatic local fallback on permission error
 */
class GoogleDriveStorageDriver implements StorageDriver {
  private drive: any;
  private rootFolderId: string;
  private folderCache: Map<string, string> = new Map();
  private localFallback: LocalFileStorageDriver;
  private driveError: string | null = null;
  private serviceAccountEmail: string = '';

  constructor(serviceAccountJson: string, rootFolderId: string) {
    this.rootFolderId = rootFolderId.trim();
    this.localFallback = new LocalFileStorageDriver();

    try {
      const credentials = JSON.parse(serviceAccountJson);
      this.serviceAccountEmail = credentials.client_email || 'service-account';
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      this.drive = google.drive({ version: 'v3', auth: auth as any });
    } catch (err: any) {
      this.driveError = 'Format SERVICE_ACCOUNT_JSON tidak valid: ' + err.message;
      console.error('Failed to initialize Google Drive client:', err);
    }
  }

  isConfigured(): boolean {
    return true;
  }

  getStorageMode(): 'google_drive' | 'local_demo' {
    return this.driveError ? 'local_demo' : 'google_drive';
  }

  getDriveStatus() {
    return {
      isConfigured: true,
      isConnected: !this.driveError,
      errorMessage: this.driveError || undefined,
      serviceAccountEmail: this.serviceAccountEmail,
    };
  }

  private handleDriveError(op: string, err: any) {
    const msg = err?.message || String(err);
    console.warn(`[Google Drive Warning during ${op}]:`, msg);
    if (
      msg.includes('Insufficient permissions') ||
      msg.includes('permission') ||
      err?.status === 403 ||
      err?.code === 403
    ) {
      this.driveError = `Service Account (${this.serviceAccountEmail}) belum memiliki izin 'Editor' pada folder Google Drive (ID: ${this.rootFolderId}). Silakan buka folder tersebut di Google Drive dan bagikan ke email service account dengan peran Editor.`;
    } else if (err?.status === 404 || err?.code === 404) {
      this.driveError = `Folder Google Drive (ID: ${this.rootFolderId}) tidak ditemukan atau belum dibagikan ke ${this.serviceAccountEmail}.`;
    } else {
      this.driveError = `Google Drive API error: ${msg}`;
    }
  }

  private async getOrCreateSubfolder(parentId: string, folderName: string): Promise<string> {
    const cacheKey = `${parentId}/${folderName}`;
    if (this.folderCache.has(cacheKey)) {
      return this.folderCache.get(cacheKey)!;
    }

    const query = `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const res = await this.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (res.data.files && res.data.files.length > 0) {
      const folderId = res.data.files[0].id;
      this.folderCache.set(cacheKey, folderId);
      return folderId;
    }

    // Create folder
    const createRes = await this.drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });

    const newId = createRes.data.id;
    this.folderCache.set(cacheKey, newId);
    return newId;
  }

  private async getFolderForPath(pathSegments: string[]): Promise<string> {
    let currentId = this.rootFolderId;
    for (const segment of pathSegments) {
      currentId = await this.getOrCreateSubfolder(currentId, segment);
    }
    return currentId;
  }

  private async readJsonFile<T>(folderId: string, fileName: string): Promise<T | null> {
    const query = `'${folderId}' in parents and name = '${fileName}' and trashed = false`;
    const res = await this.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (!res.data.files || res.data.files.length === 0) {
      return null;
    }

    const fileId = res.data.files[0].id;
    const fileRes = await this.drive.files.get({
      fileId,
      alt: 'media',
      supportsAllDrives: true,
    });

    if (typeof fileRes.data === 'string') {
      return JSON.parse(fileRes.data);
    }
    return fileRes.data as T;
  }

  private async writeJsonFile(folderId: string, fileName: string, content: any): Promise<void> {
    const query = `'${folderId}' in parents and name = '${fileName}' and trashed = false`;
    const res = await this.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const fileContent = JSON.stringify(content, null, 2);
    const media = {
      mimeType: 'application/json',
      body: fileContent,
    };

    if (res.data.files && res.data.files.length > 0) {
      // Update existing file
      const fileId = res.data.files[0].id;
      await this.drive.files.update({
        fileId,
        media,
        supportsAllDrives: true,
      });
    } else {
      // Create new file
      await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
          mimeType: 'application/json',
        },
        media,
        supportsAllDrives: true,
      });
    }
  }

  async getConfig(): Promise<CounselorConfig> {
    if (!this.driveError) {
      try {
        const configFolderId = await this.getFolderForPath(['_config']);
        const conf = await this.readJsonFile<CounselorConfig>(configFolderId, 'users.json');
        if (conf) return { ...DEFAULT_CONFIG, ...conf };
      } catch (err: any) {
        this.handleDriveError('getConfig', err);
      }
    }
    return this.localFallback.getConfig();
  }

  async saveConfig(config: CounselorConfig): Promise<void> {
    await this.localFallback.saveConfig(config);
    if (!this.driveError) {
      try {
        const configFolderId = await this.getFolderForPath(['_config']);
        await this.writeJsonFile(configFolderId, 'users.json', config);
      } catch (err: any) {
        this.handleDriveError('saveConfig', err);
      }
    }
  }

  async getEntry(email: string, date: string): Promise<DailyJournalEntry | null> {
    if (!this.driveError) {
      try {
        const safeEmail = email.toLowerCase().trim();
        const folderId = await this.getFolderForPath(['konseli', safeEmail, 'entries']);
        const entry = await this.readJsonFile<DailyJournalEntry>(folderId, `${date}.json`);
        if (entry) return entry;
      } catch (err: any) {
        this.handleDriveError('getEntry', err);
      }
    }
    return this.localFallback.getEntry(email, date);
  }

  async saveEntry(email: string, entry: DailyJournalEntry): Promise<void> {
    await this.localFallback.saveEntry(email, entry);
    if (!this.driveError) {
      try {
        const safeEmail = email.toLowerCase().trim();
        const folderId = await this.getFolderForPath(['konseli', safeEmail, 'entries']);
        await this.writeJsonFile(folderId, `${entry.date}.json`, entry);
      } catch (err: any) {
        this.handleDriveError('saveEntry', err);
      }
    }
  }

  async listEntriesForKonseli(email: string): Promise<DailyJournalEntry[]> {
    if (!this.driveError) {
      try {
        const safeEmail = email.toLowerCase().trim();
        const folderId = await this.getFolderForPath(['konseli', safeEmail, 'entries']);
        const query = `'${folderId}' in parents and trashed = false and name contains '.json'`;
        const res = await this.drive.files.list({
          q: query,
          fields: 'files(id, name)',
          pageSize: 100,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        if (res.data.files && res.data.files.length > 0) {
          const entries: DailyJournalEntry[] = [];
          for (const file of res.data.files) {
            try {
              const fileRes = await this.drive.files.get({
                fileId: file.id,
                alt: 'media',
                supportsAllDrives: true,
              });
              const parsed = typeof fileRes.data === 'string' ? JSON.parse(fileRes.data) : fileRes.data;
              entries.push(parsed);
            } catch (fileErr) {
              console.error('Error fetching file content from drive:', file.name, fileErr);
            }
          }
          if (entries.length > 0) {
            return entries.sort((a, b) => b.date.localeCompare(a.date));
          }
        }
      } catch (err: any) {
        this.handleDriveError('listEntriesForKonseli', err);
      }
    }
    return this.localFallback.listEntriesForKonseli(email);
  }

  async listAllKonseliEmails(): Promise<string[]> {
    if (!this.driveError) {
      try {
        const konseliFolderId = await this.getFolderForPath(['konseli']);
        const query = `'${konseliFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const res = await this.drive.files.list({
          q: query,
          fields: 'files(id, name)',
          pageSize: 100,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });
        if (res.data.files && res.data.files.length > 0) {
          const emails = res.data.files.map((f: any) => f.name);
          const localEmails = await this.localFallback.listAllKonseliEmails();
          return Array.from(new Set([...emails, ...localEmails]));
        }
      } catch (err: any) {
        this.handleDriveError('listAllKonseliEmails', err);
      }
    }
    return this.localFallback.listAllKonseliEmails();
  }

  async getWeeklyAnalysis(email: string, weekId: string): Promise<WeeklyAnalysisRecord | null> {
    if (!this.driveError) {
      try {
        const safeEmail = email.toLowerCase().trim();
        const folderId = await this.getFolderForPath(['konseli', safeEmail, 'analisis']);
        const record = await this.readJsonFile<WeeklyAnalysisRecord>(folderId, `${weekId}.json`);
        if (record) return record;
      } catch (err: any) {
        this.handleDriveError('getWeeklyAnalysis', err);
      }
    }
    return this.localFallback.getWeeklyAnalysis(email, weekId);
  }

  async saveWeeklyAnalysis(email: string, analysis: WeeklyAnalysisRecord): Promise<void> {
    await this.localFallback.saveWeeklyAnalysis(email, analysis);
    if (!this.driveError) {
      try {
        const safeEmail = email.toLowerCase().trim();
        const folderId = await this.getFolderForPath(['konseli', safeEmail, 'analisis']);
        await this.writeJsonFile(folderId, `${analysis.weekId}.json`, analysis);
      } catch (err: any) {
        this.handleDriveError('saveWeeklyAnalysis', err);
      }
    }
  }

  async listWeeklyAnalysesForKonseli(email: string): Promise<WeeklyAnalysisRecord[]> {
    if (!this.driveError) {
      try {
        const safeEmail = email.toLowerCase().trim();
        const folderId = await this.getFolderForPath(['konseli', safeEmail, 'analisis']);
        const query = `'${folderId}' in parents and trashed = false and name contains '.json'`;
        const res = await this.drive.files.list({
          q: query,
          fields: 'files(id, name)',
          pageSize: 50,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        if (res.data.files && res.data.files.length > 0) {
          const analyses: WeeklyAnalysisRecord[] = [];
          for (const file of res.data.files) {
            try {
              const fileRes = await this.drive.files.get({
                fileId: file.id,
                alt: 'media',
                supportsAllDrives: true,
              });
              const parsed = typeof fileRes.data === 'string' ? JSON.parse(fileRes.data) : fileRes.data;
              analyses.push(parsed);
            } catch (err) {
              console.error('Error fetching analysis file from drive:', file.name, err);
            }
          }
          if (analyses.length > 0) {
            return analyses.sort((a, b) => b.weekId.localeCompare(a.weekId));
          }
        }
      } catch (err: any) {
        this.handleDriveError('listWeeklyAnalysesForKonseli', err);
      }
    }
    return this.localFallback.listWeeklyAnalysesForKonseli(email);
  }
}

let activeStorage: StorageDriver | null = null;

export function getStorageDriver(): StorageDriver {
  if (activeStorage) return activeStorage;

  // Sesuai permintaan pengguna: penyimpanan dilakukan di server lokal (folder .data/),
  // data konseli langsung terlihat di dashboard konseli sendiri dan konselor tanpa Google Drive.
  console.log('Menggunakan Penyimpanan Server Lokal (.data/ directory)');
  activeStorage = new LocalFileStorageDriver();
  return activeStorage;
}
