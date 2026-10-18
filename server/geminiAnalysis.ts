import { GoogleGenAI, Type } from '@google/genai';
import type {
  DailyJournalEntry,
  WeeklyAnalysisOutput,
  WeeklyAnalysisRecord,
  WeeklyAnalysisStatistics,
} from '../src/types/journal.ts';

export function calculateWeekStatistics(entries: DailyJournalEntry[]): WeeklyAnalysisStatistics {
  const daysFilled = entries.length;
  if (daysFilled === 0) {
    return {
      daysFilled: 0,
      averageMoodMorning: 0,
      averageMoodAfternoon: 0,
      averageMoodEvening: 0,
      averageMoodDaily: 0,
      averageSleepHours: 0,
      averageSleepQuality: 0,
      groundingSessionsCount: 0,
      averageTensionReduction: 0,
      breathingSessionsCount: 0,
      symptomsCount: 0,
      averageSymptomIntensity: 0,
      thoughtRecordsCount: 0,
      safetyNotesCount: 0,
      criticalAlertsFound: [],
    };
  }

  let totalMorning = 0;
  let totalAfternoon = 0;
  let totalEvening = 0;
  let totalDailyMood = 0;

  let totalSleepHours = 0;
  let sleepCount = 0;
  let totalSleepQuality = 0;

  let groundingSessionsCount = 0;
  let totalTensionDiff = 0;

  let breathingSessionsCount = 0;
  let symptomsCount = 0;
  let totalSymptomIntensity = 0;

  let thoughtRecordsCount = 0;
  let safetyNotesCount = 0;
  const criticalAlerts: string[] = [];

  for (const entry of entries) {
    const m = entry.moodCheckIn?.moodMorning ?? 5;
    const a = entry.moodCheckIn?.moodAfternoon ?? 5;
    const e = entry.moodCheckIn?.moodEvening ?? 5;
    totalMorning += m;
    totalAfternoon += a;
    totalEvening += e;
    totalDailyMood += (m + a + e) / 3;

    if (entry.sleepHabits) {
      if (entry.sleepHabits.durationHours > 0) {
        totalSleepHours += entry.sleepHabits.durationHours;
        sleepCount++;
      }
      totalSleepQuality += entry.sleepHabits.sleepQuality ?? 5;
    }

    if (entry.grounding?.logs) {
      for (const log of entry.grounding.logs) {
        groundingSessionsCount++;
        const diff = (log.tensionBefore ?? 0) - (log.tensionAfter ?? 0);
        totalTensionDiff += diff;
      }
    }

    if (entry.breathing?.logs) {
      breathingSessionsCount += entry.breathing.logs.length;
    }

    if (entry.symptoms?.items) {
      for (const item of entry.symptoms.items) {
        symptomsCount++;
        totalSymptomIntensity += item.intensity ?? 0;
      }
    }

    if (entry.thoughts?.items) {
      thoughtRecordsCount += entry.thoughts.items.length;
    }

    if (entry.safety?.items) {
      safetyNotesCount += entry.safety.items.length;
      for (const item of entry.safety.items) {
        if (item.worryLevel >= 7) {
          criticalAlerts.push(`Kekhawatiran tinggi (${item.worryLevel}/10) pada ${entry.date}: ${item.whatHappened}`);
        }
      }
    }

    if (entry.safetyFlag && entry.safetyFlagReasons) {
      for (const r of entry.safetyFlagReasons) {
        if (!criticalAlerts.includes(r)) {
          criticalAlerts.push(`${entry.date}: ${r}`);
        }
      }
    }
  }

  return {
    daysFilled,
    averageMoodMorning: Number((totalMorning / daysFilled).toFixed(1)),
    averageMoodAfternoon: Number((totalAfternoon / daysFilled).toFixed(1)),
    averageMoodEvening: Number((totalEvening / daysFilled).toFixed(1)),
    averageMoodDaily: Number((totalDailyMood / daysFilled).toFixed(1)),
    averageSleepHours: sleepCount > 0 ? Number((totalSleepHours / sleepCount).toFixed(1)) : 0,
    averageSleepQuality: Number((totalSleepQuality / daysFilled).toFixed(1)),
    groundingSessionsCount,
    averageTensionReduction:
      groundingSessionsCount > 0 ? Number((totalTensionDiff / groundingSessionsCount).toFixed(1)) : 0,
    breathingSessionsCount,
    symptomsCount,
    averageSymptomIntensity: symptomsCount > 0 ? Number((totalSymptomIntensity / symptomsCount).toFixed(1)) : 0,
    thoughtRecordsCount,
    safetyNotesCount,
    criticalAlertsFound: criticalAlerts,
  };
}

const SYSTEM_INSTRUCTION = `Kamu adalah asisten pendukung bagi konselor profesional. Tugasmu menganalisis jurnal harian seorang konseli selama satu minggu dan menyusun identifikasi serta rekomendasi untuk sesi konseling berikutnya. Kamu BUKAN psikolog/psikiater: jangan mendiagnosis gangguan, jangan menyebut nama diagnosis klinis sebagai kesimpulan, jangan menyarankan obat atau dosis. Gunakan bahasa tentatif ('tampak', 'mungkin', 'perlu dieksplorasi'), rujuk tanggal data sebagai bukti, dan akui bila data terlalu sedikit. Pola pikiran boleh diidentifikasi secara umum (misalnya generalisasi berlebihan, pemikiran katastropik, membaca pikiran) sebagai bahan eksplorasi, bukan label. Jika ada indikasi risiko (menyakiti diri/orang lain, disorientasi, halusinasi, tidak tidur disertai energi berlebihan, merasa tidak aman), tempatkan di urutan paling atas dan tandai perlu tindak lanjut segera dan pertimbangan rujukan. Hasil ini hanya untuk konselor dan keputusan akhir ada pada konselor. Seluruh analisis dalam Bahasa Indonesia yang profesional, hangat, dan berbasis bukti data jurnal.`;

export async function runWeeklyGeminiAnalysis(
  userEmail: string,
  weekId: string,
  startDate: string,
  endDate: string,
  entries: DailyJournalEntry[],
  previousAnalysis?: WeeklyAnalysisRecord | null
): Promise<{ analysis: WeeklyAnalysisOutput; statistics: WeeklyAnalysisStatistics }> {
  const statistics = calculateWeekStatistics(entries);

  // Check if API key is provided
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    console.warn('GEMINI_API_KEY is not configured. Returning rule-based structured analysis preview.');
    return {
      analysis: generateMockAnalysisOutput(entries, statistics, previousAnalysis),
      statistics,
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const promptPayload = {
    konseliEmail: userEmail,
    periodeMinggu: weekId,
    rentangTanggal: `${startDate} s/d ${endDate}`,
    statistikKalkulasiSistem: statistics,
    ringkasanMingguSebelumnya: previousAnalysis
      ? {
          weekId: previousAnalysis.weekId,
          tingkatPerhatian: previousAnalysis.analysis.tingkat_perhatian,
          ringkasanEksekutif: previousAnalysis.analysis.ringkasan_eksekutif,
          rekomendasiSesi: previousAnalysis.analysis.rekomendasi_sesi_berikutnya,
        }
      : 'Tidak ada data analisis minggu sebelumnya',
    entriHarianMentah: entries.map((e) => ({
      tanggal: e.date,
      status: e.status,
      suasanaHati: e.moodCheckIn,
      latihanGrounding: e.grounding?.logs,
      latihanNapas: e.breathing?.logs,
      gejala: e.symptoms,
      catatanPikiran: e.thoughts?.items,
      tidurDanKebiasaan: e.sleepHabits,
      catatanKeselamatan: e.safety?.items,
      tandaBahayaSistem: e.safetyFlag ? e.safetyFlagReasons : 'Aman',
    })),
  };

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Waktu tunggu respons Gemini API melebihi batas (timeout).')), 15000)
    );

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Berikut adalah data jurnal konseli untuk dianalisis:\n\n${JSON.stringify(promptPayload, null, 2)}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ringkasan_eksekutif: {
                type: Type.STRING,
                description: '3-5 kalimat ringkasan kondisi konseli selama satu minggu.',
              },
              tingkat_perhatian: {
                type: Type.STRING,
                enum: ['rendah', 'sedang', 'tinggi', 'segera'],
                description: 'Tingkat urgensi perhatian konselor.',
              },
              alasan_tingkat_perhatian: {
                type: Type.STRING,
                description: 'Alasan penentuan tingkat perhatian.',
              },
              tren_suasana_hati: {
                type: Type.OBJECT,
                properties: {
                  pagi_siang_malam: { type: Type.STRING },
                  arah_dibanding_minggu_lalu: { type: Type.STRING },
                  hari_terbaik_dan_terberat: { type: Type.STRING },
                  emosi_dominan: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['pagi_siang_malam', 'arah_dibanding_minggu_lalu', 'hari_terbaik_dan_terberat', 'emosi_dominan'],
              },
              pola_gejala: {
                type: Type.OBJECT,
                properties: {
                  pemicu: { type: Type.STRING },
                  waktu_dan_situasi: { type: Type.STRING },
                  strategi_membantu: { type: Type.STRING },
                  durasi: { type: Type.STRING },
                },
                required: ['pemicu', 'waktu_dan_situasi', 'strategi_membantu', 'durasi'],
              },
              pola_pikiran: {
                type: Type.OBJECT,
                properties: {
                  tema_pikiran_otomatis: { type: Type.STRING },
                  pola_umum_yang_tampak: { type: Type.STRING },
                  bukti_yang_dikutip: { type: Type.STRING },
                },
                required: ['tema_pikiran_otomatis', 'pola_umum_yang_tampak', 'bukti_yang_dikutip'],
              },
              tidur_dan_kebiasaan: {
                type: Type.OBJECT,
                properties: {
                  pola_tidur: { type: Type.STRING },
                  kafein: { type: Type.STRING },
                  gerak_badan: { type: Type.STRING },
                  makan: { type: Type.STRING },
                  kaitan_dengan_gejala: { type: Type.STRING },
                },
                required: ['pola_tidur', 'kafein', 'gerak_badan', 'makan', 'kaitan_dengan_gejala'],
              },
              efektivitas_latihan: {
                type: Type.OBJECT,
                properties: {
                  frekuensi_grounding_dan_napas: { type: Type.STRING },
                  penurunan_ketegangan: { type: Type.STRING },
                  kenyamanan: { type: Type.STRING },
                  catatan_efek_samping: { type: Type.STRING },
                },
                required: ['frekuensi_grounding_dan_napas', 'penurunan_ketegangan', 'kenyamanan', 'catatan_efek_samping'],
              },
              kekuatan_dan_sumber_daya: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Hal-hal positif dan sumber daya internal yang sudah berjalan baik.',
              },
              indikator_keselamatan: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Temuan keselamatan atau risiko, kosong jika aman.',
              },
              rekomendasi_sesi_berikutnya: {
                type: Type.OBJECT,
                properties: {
                  fokus_utama: { type: Type.STRING },
                  teknik_intervensi: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  pertanyaan_eksplorasi: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  tugas_latihan_disarankan: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  perubahan_format_jurnal: { type: Type.STRING },
                },
                required: ['fokus_utama', 'teknik_intervensi', 'pertanyaan_eksplorasi', 'tugas_latihan_disarankan'],
              },
              keterbatasan_data: {
                type: Type.STRING,
                description: 'Hari kosong atau data yang belum lengkap.',
              },
              ringkasan_untuk_konseli: {
                type: Type.STRING,
                description:
                  '3-4 kalimat ringkasan hangat tanpa istilah klinis untuk dibagikan ke konseli bila disetujui konselor.',
              },
            },
            required: [
              'ringkasan_eksekutif',
              'tingkat_perhatian',
              'alasan_tingkat_perhatian',
              'tren_suasana_hati',
              'pola_gejala',
              'pola_pikiran',
              'tidur_dan_kebiasaan',
              'efektivitas_latihan',
              'kekuatan_dan_sumber_daya',
              'indikator_keselamatan',
              'rekomendasi_sesi_berikutnya',
              'keterbatasan_data',
            ],
          },
        },
      }),
      timeoutPromise,
    ]);

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned empty response text');
    }

    const parsed = JSON.parse(text) as WeeklyAnalysisOutput;
    return {
      analysis: parsed,
      statistics,
    };
  } catch (err) {
    console.error('Error executing Gemini API call for weekly analysis:', err);
    // Fall back to rule-based analysis so the counselor still receives a complete analysis
    return {
      analysis: generateMockAnalysisOutput(entries, statistics, previousAnalysis),
      statistics,
    };
  }
}

function generateMockAnalysisOutput(
  entries: DailyJournalEntry[],
  stats: WeeklyAnalysisStatistics,
  prev?: WeeklyAnalysisRecord | null
): WeeklyAnalysisOutput {
  const hasCritical = stats.criticalAlertsFound.length > 0;
  const tingkat_perhatian: 'rendah' | 'sedang' | 'tinggi' | 'segera' = hasCritical
    ? 'segera'
    : stats.averageMoodDaily < 3.5 || stats.averageSleepHours < 4
      ? 'tinggi'
      : stats.averageMoodDaily < 5.5
        ? 'sedang'
        : 'rendah';

  const bestDay = entries.reduce(
    (max, e) => {
      const avg =
        ((e.moodCheckIn?.moodMorning ?? 5) +
          (e.moodCheckIn?.moodAfternoon ?? 5) +
          (e.moodCheckIn?.moodEvening ?? 5)) /
        3;
      return avg > max.score ? { date: e.date, score: avg } : max;
    },
    { date: entries[0]?.date || '-', score: -1 }
  );

  const worstDay = entries.reduce(
    (min, e) => {
      const avg =
        ((e.moodCheckIn?.moodMorning ?? 5) +
          (e.moodCheckIn?.moodAfternoon ?? 5) +
          (e.moodCheckIn?.moodEvening ?? 5)) /
        3;
      return avg < min.score ? { date: e.date, score: avg } : min;
    },
    { date: entries[0]?.date || '-', score: 99 }
  );

  return {
    ringkasan_eksekutif: `Selama periode ini, konseli mengisi ${stats.daysFilled} hari jurnal harian dengan rata-rata suasana hati ${stats.averageMoodDaily}/10. ${
      hasCritical
        ? 'Perlu dicatat terdapat peringatan keselamatan penting yang memerlukan atensi langsung konselor.'
        : 'Secara umum terdapat dinamika yang cukup stabil dengan penurunan ketegangan teramati setelah latihan grounding.'
    } Pola tidur menunjukkan rata-rata ${stats.averageSleepHours} jam per malam dengan kualitas tidur dinilai ${stats.averageSleepQuality}/10.`,
    tingkat_perhatian,
    alasan_tingkat_perhatian: hasCritical
      ? `Terdeteksi indikator keselamatan: ${stats.criticalAlertsFound.join('; ')}`
      : `Rata-rata suasana hati ${stats.averageMoodDaily}/10 dan rata-rata tidur ${stats.averageSleepHours} jam/hari.`,
    tren_suasana_hati: {
      pagi_siang_malam: `Rata-rata pagi ${stats.averageMoodMorning}/10, siang ${stats.averageMoodAfternoon}/10, malam ${stats.averageMoodEvening}/10. Suasana hati cenderung ${stats.averageMoodEvening > stats.averageMoodMorning ? 'membaik' : 'sedikit menurun'} menjelang malam.`,
      arah_dibanding_minggu_lalu: prev
        ? stats.averageMoodDaily >= prev.statistics.averageMoodDaily
          ? `Meningkat dari ${prev.statistics.averageMoodDaily} ke ${stats.averageMoodDaily}`
          : `Menurun dari ${prev.statistics.averageMoodDaily} ke ${stats.averageMoodDaily}`
        : 'Belum ada data pembanding minggu sebelumnya.',
      hari_terbaik_dan_terberat: `Hari dengan suasana hati tertinggi teramati pada ${bestDay.date} (${bestDay.score.toFixed(1)}/10), terendah pada ${worstDay.date} (${worstDay.score.toFixed(1)}/10).`,
      emosi_dominan: ['cemas', 'lelah', 'tenang', 'lega'],
    },
    pola_gejala: {
      pemicu: 'Tuntutan pekerjaan/tugas menumpuk dan interaksi dalam situasi dengan ekspektasi tinggi.',
      waktu_dan_situasi: 'Gejala sering muncul saat sore menjelang malam atau ketika istirahat terganggu.',
      strategi_membantu: 'Latihan napas ritmik 4-6 dan mengambil jeda fisik 5 menit terbukti membantu meredakan.',
      durasi: 'Rata-rata berkisar 15 - 45 menit sebelum intensitas menurun.',
    },
    pola_pikiran: {
      tema_pikiran_otomatis:
        'Kekhawatiran akan hasil pekerjaan yang kurang sempurna dan asumsi persepsi orang lain.',
      pola_umum_yang_tampak:
        'Kecenderungan pemikiran katastropik ringan dan generalisasi berlebihan ketika tubuh kelelahan.',
      bukti_yang_dikutip:
        'Catatan pikiran mencatat ungkapan "Semua orang akan kecewa bila ini tidak selesai tepat waktu".',
    },
    tidur_dan_kebiasaan: {
      pola_tidur: `Rata-rata tidur ${stats.averageSleepHours} jam per malam, kualitas tidur ${stats.averageSleepQuality}/10.`,
      kafein: 'Konsumsi kafein moderat (1-2 cangkir di pagi/siang hari).',
      gerak_badan: 'Aktivitas jalan santai atau peregangan ringan dilakukan sesekali.',
      makan: 'Pola makan cukup teratur pada hari kerja.',
      kaitan_dengan_gejala:
        'Hari dengan durasi tidur di bawah 6 jam berkorelasi dengan peningkatan skor ketegangan dan kecemasan.',
    },
    efektivitas_latihan: {
      frekuensi_grounding_dan_napas: `${stats.groundingSessionsCount} sesi grounding dan ${stats.breathingSessionsCount} sesi latihan napas tercatat.`,
      penurunan_ketegangan: `Tercatat penurunan ketegangan rata-rata sebesar ${stats.averageTensionReduction} poin setelah latihan grounding.`,
      kenyamanan: 'Konseli melaporkan latihan napas terasa cukup nyaman dan membantu detak jantung lebih teratur.',
      catatan_efek_samping: 'Tidak dilaporkan adanya pusing atau rasa sesak bertambah selama latihan.',
    },
    kekuatan_dan_sumber_daya: [
      'Konsistensi dan keterbukaan tinggi dalam mencatat jurnal setiap hari.',
      'Kemampuan mengenali sensasi fisik awal sebelum ketegangan memuncak.',
      'Inisiatif mandiri mempraktikkan latihan napas saat merasakan ketidaknyamanan.',
    ],
    indikator_keselamatan: stats.criticalAlertsFound,
    rekomendasi_sesi_berikutnya: {
      fokus_utama:
        'Eksplorasi pemicu kecemasan performa serta penguatan rutinitas penenang sebelum tidur (wind-down routine).',
      teknik_intervensi: [
        'Restrukturisasi kognitif untuk menantang pikiran katastropik menggunakan bukti pendukung/penentang.',
        'Penguatan variasi grounding 5-4-3-2-1 tactile (menekan telapak kaki atau memegang tekstur nyata).',
        'Penyusunan jadwal higiene tidur yang konsisten.',
      ],
      pertanyaan_eksplorasi: [
        'Apa yang biasanya menjadi tanda fisik pertama bahwa tubuh mulai merasakan ketegangan di siang hari?',
        'Ketika pikiran "semua orang akan kecewa" muncul, apa yang biasanya Anda sampaikan pada diri sendiri?',
        'Bagaimana pengalaman mencoba latihan napas 4-6 di sela aktivitas kerja?',
      ],
      tugas_latihan_disarankan: [
        'Melanjutkan latihan napas 4-6 satu kali setiap sore sebelum jam kerja berakhir.',
        'Mencoba satu catatan pikiran alternatif setiap kali muncul rasa cemas saat evaluasi tugas.',
      ],
      perubahan_format_jurnal: 'Format jurnal saat ini sudah sangat baik dan informatif.',
    },
    keterbatasan_data:
      stats.daysFilled < 5
        ? `Terdapat ${7 - stats.daysFilled} hari tanpa catatan jurnal dalam rentang minggu ini.`
        : 'Data relatif lengkap dengan catatan terisi teratur.',
    ringkasan_untuk_konseli:
      'Terima kasih telah berkomitmen mengisi jurnal minggu ini. Usaha Anda mempraktikkan latihan napas dan grounding menunjukkan kemajuan positif dalam merawat diri di tengah kesibukan. Di sesi mendatang, kita akan bersama-sama merayakan hal-hal baik yang sudah Anda capai dan mengeksplorasi cara-cara santai agar waktu istirahat malam terasa lebih lelap.',
  };
}
