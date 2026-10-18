import { DailyJournalEntry } from '../src/types/journal.js';
import { scanEntryForSafetyRisks } from './ruleAlerts.js';

export function createSampleEntries(email: string, name: string): DailyJournalEntry[] {
  const entries: DailyJournalEntry[] = [];
  const today = new Date();

  if (email.includes('anisa')) {
    // 7 consecutive days of active counseling journal
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const baseMood = 5 + (6 - i) * 0.4;
      const morningMood = Math.min(9, Math.max(3, Math.round(baseMood + (i % 2 === 0 ? 1 : -1))));
      const afternoonMood = Math.min(9, Math.max(3, Math.round(baseMood - 0.5)));
      const eveningMood = Math.min(9, Math.max(4, Math.round(baseMood + 1)));

      const entry: DailyJournalEntry = {
        date: dateStr,
        userEmail: email,
        userName: name,
        status: 'submitted',
        submittedAt: `${dateStr}T21:30:00Z`,
        updatedAt: `${dateStr}T21:30:00Z`,
        safetyFlag: false,
        safetyFlagReasons: [],
        moodCheckIn: {
          moodMorning: morningMood,
          moodAfternoon: afternoonMood,
          moodEvening: eveningMood,
          dominantEmotions: i % 2 === 0 ? ['cemas', 'lelah', 'tenang'] : ['senang', 'lega', 'bersyukur'],
          moodNote:
            i === 0
              ? 'Hari ini beban tugas presentasi kantor akhirnya selesai. Merasa jauh lebih lega setelah makan malam.'
              : 'Menghadiri beberapa rapat panjang. Sempat merasa tegang di bahu saat siang hari.',
        },
        grounding: {
          logs: [
            {
              id: `gr-${dateStr}-1`,
              time: '14:15',
              tensionBefore: 7,
              tensionAfter: 4,
              noticed:
                'Melihat tanaman hijau di meja, merasakan permukaan meja kayu yang halus. Tarikan napas perlahan membuat dada terasa lebih lapang.',
              variationUsed: 'Menekan telapak kaki ke lantai & memegang benda bertekstur',
              guidedSteps: {
                see: ['Tanaman monstera', 'Layar laptop', 'Cangkir keramik', 'Jendela luar', 'Buku catatan'],
                feel: ['Permukaan meja kayu', 'Kain celana katun', 'Suhu ruangan sejuk', 'Telapak kaki di lantai'],
                hear: ['Desau pendingin ruangan', 'Suara ketikan keyboard', 'Suara burung di luar'],
                smell: ['Aroma teh chamomile', 'Wangi kertas baru'],
                tasteOrKindWords: 'Saya mampu melewati ini satu demi satu dengan tenang.',
              },
            },
          ],
        },
        breathing: {
          logs: [
            {
              id: `br-${dateStr}-1`,
              time: '20:45',
              durationMinutes: 3,
              feltComfortable: 'Ya',
              perceivedChanges: 'Detak jantung yang awalnya terasa cepat berangsur normal dan bahu terasa turun santai.',
              notes: 'Ritme 4 detik hirup dan 6 detik hembus terasa sangat pas dan tidak membuat terengah.',
            },
          ],
        },
        symptoms: {
          items:
            i % 2 === 1
              ? [
                  {
                    id: `sym-${dateStr}-1`,
                    time: '11:30',
                    symptom: 'Jantung berdebar dan pikiran cemas memikirkan tenggat waktu',
                    intensity: 6,
                    triggerSituation: 'Menerima email revisi mendadak dari atasan',
                    actionTaken: 'Menjauh dari layar 5 menit dan minum air putih hangat',
                    whatHelped: 'Melakukan jeda sejenak dan menepuk bahu pelan',
                    duration: '25 menit',
                  },
                ]
              : [],
          patternsNoticed: 'Kecemasan cenderung muncul ketika ada interupsi tugas tanpa peringatan sebelumnya.',
        },
        thoughts: {
          items: [
            {
              id: `th-${dateStr}-1`,
              situation: 'Mempersiapkan materi laporan evaluasi bulanan di kantor',
              automaticThoughts: 'Saya pasti melakukan kesalahan fatal dan semua orang akan kecewa.',
              emotions: 'Cemas dan takut',
              emotionIntensity: 7,
              bodyReaction: 'Perut terasa mual ringan dan leher kaku',
              alternativePerspective:
                'Jika sahabat saya yang mengerjakan ini, saya akan mengingatkannya bahwa revisi adalah hal lumrah dan dia sudah mempersiapkan data dengan teliti.',
              feelingAfterwards: 4,
            },
          ],
        },
        sleepHabits: {
          sleepTime: '23:15',
          wakeTime: '06:15',
          durationHours: 7,
          frequentAwakening: false,
          sleepQuality: Math.min(9, 6 + (6 - i) * 0.3),
          caffeine: '1 cangkir teh hijau pagi hari',
          exerciseMinutes: 20,
          regularMeals: true,
        },
        safety: {
          items: [],
        },
      };

      const safetyScan = scanEntryForSafetyRisks(entry);
      entry.safetyFlag = safetyScan.isCritical;
      entry.safetyFlagReasons = safetyScan.reasons;
      entries.push(entry);
    }
  } else if (email.includes('budi')) {
    // Konseli dengan safety alert tinggi
    for (let i = 3; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const entry: DailyJournalEntry = {
        date: dateStr,
        userEmail: email,
        userName: name,
        status: 'submitted',
        submittedAt: `${dateStr}T22:00:00Z`,
        updatedAt: `${dateStr}T22:00:00Z`,
        safetyFlag: i === 0 || i === 1,
        safetyFlagReasons:
          i === 0
            ? ['Catatan keselamatan terisi dengan tingkat kekhawatiran 8/10']
            : i === 1
              ? ['Catatan keselamatan terisi dengan tingkat kekhawatiran 7/10']
              : [],
        moodCheckIn: {
          moodMorning: 3,
          moodAfternoon: 2,
          moodEvening: 2,
          dominantEmotions: ['sedih', 'cemas', 'lelah', 'kosong'],
          moodNote: 'Sulit sekali memulai hari, rasa hampa dan berat tidak kunjung hilang sejak bangun pagi.',
        },
        grounding: {
          logs: [
            {
              id: `gr-${dateStr}-1`,
              time: '16:00',
              tensionBefore: 8,
              tensionAfter: 7,
              noticed: 'Hanya bisa fokus pada 2 benda di sekitar karena pikiran terasa sangat penuh.',
              variationUsed: 'Menekan telapak kaki ke lantai',
            },
          ],
        },
        breathing: {
          logs: [],
        },
        symptoms: {
          items: [
            {
              id: `sym-${dateStr}-1`,
              time: '15:20',
              symptom: 'Sesak napas hebat, gemetar di tangan, dan rasa panik mendadak',
              intensity: 8,
              triggerSituation: 'Berada di tempat ramai di stasiun saat jam pulang kerja',
              actionTaken: 'Duduk di bangku pinggir dan menundukkan kepala',
              whatHelped: 'Menghirup minyak angin aroma lavender yang dibawakan teman',
              duration: '40 menit',
            },
          ],
          patternsNoticed: 'Keramaian suara bising memicu sensasi sesak dan ingin segera melarikan diri.',
        },
        thoughts: {
          items: [
            {
              id: `th-${dateStr}-1`,
              situation: 'Duduk sendirian di kamar setelah pulang kerja',
              automaticThoughts: 'Saya menjadi beban bagi orang sekitar dan keadaan tidak akan membaik.',
              emotions: 'Putus asa dan bersalah',
              emotionIntensity: 8,
              bodyReaction: 'Dada terasa tertindih beban berat',
              alternativePerspective:
                'Konselor pernah menyampaikan bahwa ini adalah episode ketegangan sementara dan otak saya sedang lelah.',
              feelingAfterwards: 6,
            },
          ],
        },
        sleepHabits: {
          sleepTime: '01:30',
          wakeTime: '05:00',
          durationHours: 3.5,
          frequentAwakening: true,
          sleepQuality: 2,
          caffeine: '3 cangkir kopi hitam',
          exerciseMinutes: 0,
          regularMeals: false,
        },
        safety: {
          items:
            i === 0
              ? [
                  {
                    id: `safe-${dateStr}-1`,
                    time: '21:10',
                    whatHappened:
                      'Merasa sangat kewalahan dan ada bisikan pikiran ingin menyerah sepenuhnya dengan kehidupan karena merasa tidak kuat.',
                    worryLevel: 8,
                    actionTaken: 'Menelepon kakak kandung untuk menemani di kamar dan meminum air hangat.',
                    contactedWhom: 'Kakak kandung (Ibu Rina)',
                  },
                ]
              : [],
        },
      };

      const safetyScan = scanEntryForSafetyRisks(entry);
      entry.safetyFlag = safetyScan.isCritical;
      entry.safetyFlagReasons = safetyScan.reasons;
      entries.push(entry);
    }
  } else if (email.includes('citra')) {
    // Konseli yang absen 4 hari
    for (let i = 8; i >= 4; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const entry: DailyJournalEntry = {
        date: dateStr,
        userEmail: email,
        userName: name,
        status: 'submitted',
        submittedAt: `${dateStr}T20:00:00Z`,
        updatedAt: `${dateStr}T20:00:00Z`,
        safetyFlag: false,
        safetyFlagReasons: [],
        moodCheckIn: {
          moodMorning: 4,
          moodAfternoon: 4,
          moodEvening: 5,
          dominantEmotions: ['lelah', 'kosong'],
          moodNote: 'Hari biasa, energi agak rendah.',
        },
        grounding: { logs: [] },
        breathing: {
          logs: [
            {
              id: `br-${dateStr}-1`,
              time: '19:30',
              durationMinutes: 2,
              feltComfortable: 'Sedikit',
              perceivedChanges: 'Sedikit lebih rileks',
              notes: '',
            },
          ],
        },
        symptoms: { items: [], patternsNoticed: '' },
        thoughts: { items: [] },
        sleepHabits: {
          sleepTime: '23:30',
          wakeTime: '06:00',
          durationHours: 6.5,
          frequentAwakening: false,
          sleepQuality: 5,
          caffeine: '1 cangkir kopi',
          exerciseMinutes: 10,
          regularMeals: true,
        },
        safety: { items: [] },
      };

      entries.push(entry);
    }
  }

  return entries;
}
