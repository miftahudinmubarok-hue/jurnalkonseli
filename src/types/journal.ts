export type UserRole = 'konseli' | 'konselor' | 'admin';

export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  isAdmin: boolean;
  consentGivenAt?: string | null;
}

export interface UserAccount {
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  createdAt: string;
}

export interface CounselorConfig {
  counselorEmails: string[];
  consentTimestamps: Record<string, string>; // email -> ISO timestamp
  accounts?: UserAccount[];
  emergencySettings?: {
    emergencyNumber: string;
    hotlineName: string;
    hotlineExtension: string;
    nearestHospitalNote: string;
    counselorContact: string;
  };
  alertThresholds?: {
    lowMoodThreshold: number; // default 2
    lowMoodDays: number; // default 3
    lowSleepHours: number; // default 4
    lowSleepDays: number; // default 3
    inactiveDays: number; // default 3
    highWorryThreshold: number; // default 7
  };
}

export interface MoodCheckIn {
  moodMorning: number; // 0-10
  moodAfternoon: number; // 0-10
  moodEvening: number; // 0-10
  dominantEmotions: string[];
  otherEmotion?: string;
  moodNote: string;
}

export interface GroundingStepLog {
  id: string;
  time: string;
  tensionBefore: number; // 0-10
  tensionAfter: number; // 0-10
  noticed: string;
  variationUsed?: string;
  guidedSteps?: {
    see: string[];
    feel: string[];
    hear: string[];
    smell: string[];
    tasteOrKindWords: string;
  };
}

export interface GroundingSection {
  logs: GroundingStepLog[];
}

export interface BreathingStepLog {
  id: string;
  time: string;
  durationMinutes: number;
  feltComfortable: 'Ya' | 'Sedikit' | 'Tidak';
  perceivedChanges: string;
  notes: string;
}

export interface BreathingSection {
  logs: BreathingStepLog[];
}

export interface SymptomItem {
  id: string;
  time: string;
  symptom: string; // e.g. panik, dada sesak, jantung berdebar
  intensity: number; // 0-10
  triggerSituation: string;
  actionTaken: string;
  whatHelped: string;
  duration: string;
}

export interface SymptomsSection {
  items: SymptomItem[];
  patternsNoticed: string;
}

export interface ThoughtRecordItem {
  id: string;
  time?: string;
  situation: string; // apa, di mana, dengan siapa
  automaticThoughts: string;
  emotions: string;
  emotionIntensity: number; // 0-10
  bodyReaction: string;
  alternativePerspective: string; // sudut pandang lain / bagaimana jika sahabat saya mengalami ini
  feelingAfterwards: number; // 0-10
}

export interface ThoughtsSection {
  items: ThoughtRecordItem[];
}

export interface SleepAndHabitsSection {
  sleepTime: string; // e.g. "23:00"
  wakeTime: string; // e.g. "06:30"
  durationHours: number; // auto-calculated or edited
  frequentAwakening: boolean;
  sleepQuality: number; // 0-10
  caffeine: string; // e.g. "2 cangkir kopi"
  exerciseMinutes: number; // menit
  regularMeals: boolean;
}

export interface SafetyNoteItem {
  id: string;
  time: string;
  whatHappened: string;
  worryLevel: number; // 0-10
  actionTaken: string;
  contactedWhom: string;
}

export interface SafetySection {
  items: SafetyNoteItem[];
}

export interface DailyJournalEntry {
  date: string; // YYYY-MM-DD
  userEmail: string;
  userName?: string;
  status: 'draft' | 'submitted';
  submittedAt?: string;
  updatedAt: string;
  safetyFlag: boolean;
  safetyFlagReasons: string[];
  
  // Sections A - G
  moodCheckIn: MoodCheckIn;
  grounding: GroundingSection;
  breathing: BreathingSection;
  symptoms: SymptomsSection;
  thoughts: ThoughtsSection;
  sleepHabits: SleepAndHabitsSection;
  safety: SafetySection;
}

export interface WeeklyAnalysisStatistics {
  daysFilled: number;
  averageMoodMorning: number;
  averageMoodAfternoon: number;
  averageMoodEvening: number;
  averageMoodDaily: number;
  averageSleepHours: number;
  averageSleepQuality: number;
  groundingSessionsCount: number;
  averageTensionReduction: number;
  breathingSessionsCount: number;
  symptomsCount: number;
  averageSymptomIntensity: number;
  thoughtRecordsCount: number;
  safetyNotesCount: number;
  criticalAlertsFound: string[];
}

export interface WeeklyAnalysisOutput {
  ringkasan_eksekutif: string;
  tingkat_perhatian: 'rendah' | 'sedang' | 'tinggi' | 'segera';
  alasan_tingkat_perhatian: string;
  tren_suasana_hati: {
    pagi_siang_malam: string;
    arah_dibanding_minggu_lalu: string;
    hari_terbaik_dan_terberat: string;
    emosi_dominan: string[];
  };
  pola_gejala: {
    pemicu: string;
    waktu_dan_situasi: string;
    strategi_membantu: string;
    durasi: string;
  };
  pola_pikiran: {
    tema_pikiran_otomatis: string;
    pola_umum_yang_tampak: string;
    bukti_yang_dikutip: string;
  };
  tidur_dan_kebiasaan: {
    pola_tidur: string;
    kafein: string;
    gerak_badan: string;
    makan: string;
    kaitan_dengan_gejala: string;
  };
  efektivitas_latihan: {
    frekuensi_grounding_dan_napas: string;
    penurunan_ketegangan: string;
    kenyamanan: string;
    catatan_efek_samping: string;
  };
  kekuatan_dan_sumber_daya: string[];
  indikator_keselamatan: string[];
  rekomendasi_sesi_berikutnya: {
    fokus_utama: string;
    teknik_intervensi: string[];
    pertanyaan_eksplorasi: string[];
    tugas_latihan_disarankan: string[];
    perubahan_format_jurnal?: string;
  };
  keterbatasan_data: string;
  ringkasan_untuk_konseli?: string;
}

export interface WeeklyAnalysisRecord {
  weekId: string; // YYYY-Www e.g. 2026-W42
  startDate: string; // Monday YYYY-MM-DD
  endDate: string; // Sunday YYYY-MM-DD
  userEmail: string;
  analyzedAt: string;
  status: 'draft' | 'approved';
  counselorNotes: string;
  sharedWithClient: boolean;
  sharedAt?: string;
  modelUsed: string;
  statistics: WeeklyAnalysisStatistics;
  analysis: WeeklyAnalysisOutput;
}

export interface RuleAlertBadge {
  type: 'safety_worry' | 'risk_keyword' | 'prolonged_low_mood' | 'prolonged_low_sleep' | 'inactive_gap';
  severity: 'urgent' | 'warning' | 'info';
  message: string;
  detectedAtDate?: string;
}

export interface KonseliSummary {
  email: string;
  name: string;
  picture?: string;
  consentGivenAt?: string;
  lastEntryDate?: string;
  totalEntries: number;
  averageMood7Days: number;
  moodTrend: 'up' | 'down' | 'stable';
  attentionLevel: 'rendah' | 'sedang' | 'tinggi' | 'segera';
  activeAlerts: RuleAlertBadge[];
  daysSinceLastEntry: number;
  latestWeeklyAnalysis?: {
    weekId: string;
    analyzedAt: string;
    tingkat_perhatian: 'rendah' | 'sedang' | 'tinggi' | 'segera';
    status: 'draft' | 'approved';
  };
}
