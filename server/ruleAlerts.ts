import { DailyJournalEntry, RuleAlertBadge } from '../src/types/journal.js';

export const RISK_KEYWORDS = [
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

export function scanTextForRiskKeywords(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const kw of RISK_KEYWORDS) {
    if (lower.includes(kw)) {
      matched.push(kw);
    }
  }
  return matched;
}

export function scanEntryForSafetyRisks(entry: DailyJournalEntry): {
  isCritical: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Check safety section worry level >= 7
  if (entry.safety?.items && entry.safety.items.length > 0) {
    for (const item of entry.safety.items) {
      if (item.worryLevel >= 7) {
        reasons.push(`Catatan keselamatan terisi dengan tingkat kekhawatiran ${item.worryLevel}/10`);
      }
    }
  }

  // Check all text fields for keywords
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
    .join(' ');

  const matchedKeywords = scanTextForRiskKeywords(textCorpus);
  if (matchedKeywords.length > 0) {
    reasons.push(`Terdeteksi kata kunci risiko: "${matchedKeywords.join(', ')}"`);
  }

  return {
    isCritical: reasons.length > 0,
    reasons,
  };
}

export function computeKonseliAlertBadges(
  entries: DailyJournalEntry[],
  now: Date = new Date()
): RuleAlertBadge[] {
  const badges: RuleAlertBadge[] = [];

  // Sort entries by date ascending
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // 1. Check recent critical safety flag (in last 7 days)
  const recentCritical = sorted.filter((e) => e.safetyFlag);
  if (recentCritical.length > 0) {
    const latest = recentCritical[recentCritical.length - 1];
    badges.push({
      type: 'safety_worry',
      severity: 'urgent',
      message: `Perhatian Segera: ${latest.safetyFlagReasons?.join('; ') || 'Catatan keselamatan terdeteksi'} (${latest.date})`,
      detectedAtDate: latest.date,
    });
  }

  // 2. Check mood <= 2 for 3 consecutive recorded days
  let consecutiveLowMood = 0;
  let lowMoodStreakEnd = '';
  for (const e of sorted) {
    const morning = e.moodCheckIn?.moodMorning ?? 5;
    const afternoon = e.moodCheckIn?.moodAfternoon ?? 5;
    const evening = e.moodCheckIn?.moodEvening ?? 5;
    const avg = (morning + afternoon + evening) / 3;
    if (avg <= 2.5) {
      consecutiveLowMood++;
      lowMoodStreakEnd = e.date;
      if (consecutiveLowMood >= 3) {
        break;
      }
    } else {
      consecutiveLowMood = 0;
    }
  }

  if (consecutiveLowMood >= 3) {
    badges.push({
      type: 'prolonged_low_mood',
      severity: 'warning',
      message: `Suasana hati sangat rendah (≤ 2.5) selama 3 hari berturut-turut (${lowMoodStreakEnd})`,
      detectedAtDate: lowMoodStreakEnd,
    });
  }

  // 3. Sleep < 4 hours for 3 consecutive days
  let consecutiveLowSleep = 0;
  let lowSleepStreakEnd = '';
  for (const e of sorted) {
    const sleepHrs = e.sleepHabits?.durationHours ?? 7;
    if (sleepHrs > 0 && sleepHrs < 4) {
      consecutiveLowSleep++;
      lowSleepStreakEnd = e.date;
      if (consecutiveLowSleep >= 3) {
        break;
      }
    } else {
      consecutiveLowSleep = 0;
    }
  }

  if (consecutiveLowSleep >= 3) {
    badges.push({
      type: 'prolonged_low_sleep',
      severity: 'warning',
      message: `Waktu tidur kurang dari 4 jam selama 3 hari berturut-turut (${lowSleepStreakEnd})`,
      detectedAtDate: lowSleepStreakEnd,
    });
  }

  // 4. Inactivity: no entry for >= 3 days
  if (sorted.length > 0) {
    const lastEntryDate = new Date(sorted[sorted.length - 1].date);
    const diffDays = Math.floor((now.getTime() - lastEntryDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 3) {
      badges.push({
        type: 'inactive_gap',
        severity: 'info',
        message: `Belum mengisi jurnal selama ${diffDays} hari berturut-turut`,
      });
    }
  } else {
    badges.push({
      type: 'inactive_gap',
      severity: 'info',
      message: 'Belum pernah mengisi jurnal',
    });
  }

  return badges;
}
