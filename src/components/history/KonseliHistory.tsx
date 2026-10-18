import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Moon,
  Sparkles,
  Heart,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
  Shield,
  Eye,
} from 'lucide-react';
import { DailyJournalEntry } from '../../types/journal.js';

interface KonseliHistoryProps {
  entries: DailyJournalEntry[];
  sharedAnalyses: Array<{
    weekId: string;
    startDate: string;
    endDate: string;
    sharedAt?: string;
    ringkasan_untuk_konseli?: string;
    kekuatan_dan_sumber_daya: string[];
  }>;
  onSelectDate: (date: string) => void;
}

export const KonseliHistory: React.FC<KonseliHistoryProps> = ({
  entries,
  sharedAnalyses,
  onSelectDate,
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [selectedEntry, setSelectedEntry] = useState<DailyJournalEntry | null>(null);

  // Month navigation
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  // Map entries by date
  const entryMap = new Map<string, DailyJournalEntry>();
  entries.forEach((e) => entryMap.set(e.date, e));

  // Calculate consistency streak
  const sortedDates = [...entries]
    .map((e) => e.date)
    .sort()
    .reverse();

  let streak = 0;
  const todayStr = new Date().toISOString().split('T')[0];
  let checkDate = new Date();

  // If today is filled or yesterday was filled
  if (entryMap.has(todayStr)) {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    // check yesterday
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = checkDate.toISOString().split('T')[0];
    if (entryMap.has(yesterdayStr)) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  while (streak > 0) {
    const dStr = checkDate.toISOString().split('T')[0];
    if (entryMap.has(dStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate averages for charts
  const recent7 = entries.slice(0, 7).reverse();

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Streak / Konsistensi Card dengan Bahasa Suportif */}
      <div className="bg-gradient-to-br from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-md">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>Apresiasi Perjalanan Refleksi Diri</span>
          </div>
          <span className="text-xs bg-emerald-700/50 text-emerald-100 rounded-xl px-2.5 py-1 font-mono">
            {entries.length} Hari Tercatat
          </span>
        </div>

        <h3 className="text-xl font-bold mb-2">
          {streak > 0
            ? `Konsistensi ${streak} Hari Berturut-Turut`
            : 'Setiap Langkah Kecil Sangatlah Berarti'}
        </h3>
        <p className="text-xs text-emerald-100/90 leading-relaxed max-w-xl">
          {streak >= 3
            ? 'Luar biasa! Anda telah meluangkan waktu untuk hadir dan mendengarkan diri sendiri secara konsisten. Terus rawat ritme yang nyaman ini.'
            : 'Tidak perlu sempurna. Bahkan ketika Anda hanya mengisi satu bagian singkat atau rehat sejenak, Anda sedang belajar mengenali kebutuhan tubuh dan pikiran Anda.'}
        </p>
      </div>

      {/* 2. Catatan Ringkasan dari Konselor (Jika Dibagikan) */}
      {sharedAnalyses.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
            <Heart className="w-4 h-4 text-amber-700" />
            <span>Pesan & Ringkasan Mingguan dari Konselor Anda</span>
          </div>
          {sharedAnalyses.map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-4 border border-amber-100 text-xs space-y-2">
              <div className="flex items-center justify-between text-stone-500 text-[11px]">
                <span className="font-semibold text-stone-800">Periode {item.weekId}</span>
                <span>Dibagikan pada {item.sharedAt ? new Date(item.sharedAt).toLocaleDateString('id-ID') : '-'}</span>
              </div>
              <p className="text-stone-800 leading-relaxed">{item.ringkasan_untuk_konseli}</p>
              {item.kekuatan_dan_sumber_daya?.length > 0 && (
                <div className="pt-2 border-t border-stone-100">
                  <span className="font-semibold text-emerald-900 block mb-1">
                    Kekuatan & Kemajuan Positif yang Anda Tunjukkan:
                  </span>
                  <ul className="list-disc list-inside text-stone-600 space-y-0.5 text-[11px]">
                    {item.kekuatan_dan_sumber_daya.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3. Kalender Bulanan */}
      <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-800" />
            <h3 className="text-sm font-bold text-stone-900">
              {currentMonthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-stone-400 mb-2">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const entry = entryMap.get(dateStr);
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => {
                  if (entry) setSelectedEntry(entry);
                  else onSelectDate(dateStr);
                }}
                className={`h-11 rounded-2xl flex flex-col items-center justify-center relative text-xs transition-colors ${
                  entry
                    ? 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100 font-semibold border border-emerald-200/60'
                    : isToday
                      ? 'bg-stone-100 text-stone-900 border border-stone-300 font-semibold'
                      : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span>{dayNum}</span>
                {entry && (
                  <span className="w-1.5 h-1.5 bg-emerald-700 rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-[11px] text-stone-500 mt-4 pt-3 border-t border-stone-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />
            <span>Jurnal Terisi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-stone-200 rounded-full" />
            <span>Belum Terisi</span>
          </div>
        </div>
      </div>

      {/* 4. Grafik Pribadi Ringkas (Visual Bar/Trend) */}
      {recent7.length > 0 && (
        <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs space-y-6">
          <h3 className="text-sm font-bold text-stone-900">Tren Refleksi 7 Hari Terakhir</h3>

          {/* Tren Suasana Hati */}
          <div>
            <div className="flex justify-between items-center text-xs text-stone-600 mb-2">
              <span className="font-semibold text-stone-800">Rata-rata Suasana Hati Harian (0-10)</span>
              <span className="text-[11px] text-stone-400">Pagi / Siang / Malam</span>
            </div>
            <div className="grid grid-cols-7 gap-2 items-end h-28 bg-stone-50/70 p-3 rounded-2xl border border-stone-100">
              {recent7.map((e, idx) => {
                const avg =
                  ((e.moodCheckIn?.moodMorning ?? 5) +
                    (e.moodCheckIn?.moodAfternoon ?? 5) +
                    (e.moodCheckIn?.moodEvening ?? 5)) /
                  3;
                const heightPct = Math.max(15, Math.min(100, (avg / 10) * 100));
                const dayLabel = new Date(e.date).toLocaleDateString('id-ID', { weekday: 'narrow' });

                return (
                  <div key={idx} className="flex flex-col items-center h-full justify-end">
                    <span className="text-[10px] font-mono font-semibold text-emerald-900 mb-1">
                      {avg.toFixed(1)}
                    </span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[24px] bg-emerald-700 rounded-t-lg transition-all"
                    />
                    <span className="text-[10px] text-stone-500 mt-1 font-medium">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Durasi & Kualitas Tidur */}
          <div>
            <div className="flex justify-between items-center text-xs text-stone-600 mb-2">
              <span className="font-semibold text-stone-800">Durasi Tidur (Jam)</span>
              <span className="text-[11px] text-stone-400">Target Sehat: 7 - 9 Jam</span>
            </div>
            <div className="grid grid-cols-7 gap-2 items-end h-24 bg-stone-50/70 p-3 rounded-2xl border border-stone-100">
              {recent7.map((e, idx) => {
                const hrs = e.sleepHabits?.durationHours ?? 0;
                const heightPct = Math.max(10, Math.min(100, (hrs / 12) * 100));
                const dayLabel = new Date(e.date).toLocaleDateString('id-ID', { weekday: 'narrow' });

                return (
                  <div key={idx} className="flex flex-col items-center h-full justify-end">
                    <span className="text-[10px] font-mono text-purple-900 mb-0.5">{hrs}j</span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[24px] bg-purple-700 rounded-t-lg transition-all"
                    />
                    <span className="text-[10px] text-stone-500 mt-1 font-medium">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. Daftar Entri Terbaru */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-stone-900">Daftar Entri Terbaru</h3>
        <div className="space-y-2">
          {entries.map((entry) => {
            const avgMood =
              ((entry.moodCheckIn?.moodMorning ?? 5) +
                (entry.moodCheckIn?.moodAfternoon ?? 5) +
                (entry.moodCheckIn?.moodEvening ?? 5)) /
              3;

            return (
              <div
                key={entry.date}
                className="bg-white border border-stone-200/80 rounded-2xl p-4 flex items-center justify-between text-xs hover:border-emerald-700/50 transition-colors shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2 text-stone-500 text-[11px] mb-1">
                    <span className="font-bold text-stone-900">
                      {new Date(entry.date).toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span>·</span>
                    <span className="font-mono">Mood: {avgMood.toFixed(1)}/10</span>
                    <span>·</span>
                    <span>Tidur: {entry.sleepHabits?.durationHours ?? '-'} jam</span>
                  </div>
                  <p className="text-stone-700 line-clamp-1">
                    {entry.moodCheckIn?.moodNote ||
                      (entry.moodCheckIn?.dominantEmotions?.length
                        ? `Emosi: ${entry.moodCheckIn.dominantEmotions.join(', ')}`
                        : 'Entri jurnal tersimpan')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(entry)}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-medium transition-colors"
                  >
                    Lihat Detail
                  </button>
                  {entry.date === todayStr && (
                    <button
                      type="button"
                      onClick={() => onSelectDate(entry.date)}
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-medium transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Detail Entri (Read-Only) */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[85vh] bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-xs text-emerald-800 font-semibold block">Detail Catatan Jurnal</span>
                <h3 className="text-base font-bold text-stone-900">
                  {new Date(selectedEntry.date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="text-stone-400 hover:text-stone-600 text-xs px-3 py-1.5 bg-stone-100 rounded-xl"
              >
                Tutup
              </button>
            </div>

            {/* Suasana hati */}
            <div className="bg-stone-50 p-4 rounded-2xl text-xs space-y-1">
              <span className="font-semibold text-stone-900 block">Suasana Hati:</span>
              <div className="text-stone-600">
                Pagi: {selectedEntry.moodCheckIn?.moodMorning}/10 · Siang:{' '}
                {selectedEntry.moodCheckIn?.moodAfternoon}/10 · Malam:{' '}
                {selectedEntry.moodCheckIn?.moodEvening}/10
              </div>
              {selectedEntry.moodCheckIn?.dominantEmotions?.length > 0 && (
                <div className="text-emerald-900 font-medium">
                  Emosi dominan: {selectedEntry.moodCheckIn.dominantEmotions.join(', ')}
                </div>
              )}
              {selectedEntry.moodCheckIn?.moodNote && (
                <p className="text-stone-800 italic mt-1">&ldquo;{selectedEntry.moodCheckIn.moodNote}&rdquo;</p>
              )}
            </div>

            {/* Grounding logs */}
            {selectedEntry.grounding?.logs?.length > 0 && (
              <div className="bg-stone-50 p-4 rounded-2xl text-xs space-y-2">
                <span className="font-semibold text-stone-900 block">Latihan Grounding:</span>
                {selectedEntry.grounding.logs.map((g) => (
                  <div key={g.id} className="border-b border-stone-200/60 pb-1.5 last:border-0">
                    <div className="text-stone-500 text-[11px]">
                      {g.time} · Ketegangan: {g.tensionBefore} → {g.tensionAfter}
                    </div>
                    <p className="text-stone-800">{g.noticed}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Breathing logs */}
            {selectedEntry.breathing?.logs?.length > 0 && (
              <div className="bg-stone-50 p-4 rounded-2xl text-xs space-y-2">
                <span className="font-semibold text-stone-900 block">Latihan Napas:</span>
                {selectedEntry.breathing.logs.map((b) => (
                  <div key={b.id} className="border-b border-stone-200/60 pb-1.5 last:border-0">
                    <div className="text-stone-500 text-[11px]">
                      {b.time} · {b.durationMinutes} Menit · Terasa Nyaman: {b.feltComfortable}
                    </div>
                    <p className="text-stone-800">{b.perceivedChanges}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Gejala */}
            {selectedEntry.symptoms?.items?.length > 0 && (
              <div className="bg-stone-50 p-4 rounded-2xl text-xs space-y-2">
                <span className="font-semibold text-stone-900 block">Catatan Gejala:</span>
                {selectedEntry.symptoms.items.map((s) => (
                  <div key={s.id} className="border-b border-stone-200/60 pb-1.5 last:border-0">
                    <div className="text-stone-500 text-[11px]">
                      {s.time} · Intensitas: {s.intensity}/10 · Durasi: {s.duration || '-'}
                    </div>
                    <p className="font-medium text-stone-900">{s.symptom}</p>
                    <p className="text-stone-600">Pemicu: {s.triggerSituation}</p>
                    <p className="text-stone-600">Membantu: {s.whatHelped}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Pikiran */}
            {selectedEntry.thoughts?.items?.length > 0 && (
              <div className="bg-stone-50 p-4 rounded-2xl text-xs space-y-2">
                <span className="font-semibold text-stone-900 block">Catatan Pikiran:</span>
                {selectedEntry.thoughts.items.map((t) => (
                  <div key={t.id} className="border-b border-stone-200/60 pb-1.5 last:border-0 space-y-1">
                    <p className="text-stone-600">Situasi: {t.situation}</p>
                    <p className="font-medium text-stone-900">Pikiran: &ldquo;{t.automaticThoughts}&rdquo;</p>
                    <p className="text-emerald-900">Sudut pandang alternatif: {t.alternativePerspective}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tidur */}
            <div className="bg-stone-50 p-4 rounded-2xl text-xs space-y-1">
              <span className="font-semibold text-stone-900 block">Tidur & Kebiasaan:</span>
              <p className="text-stone-700">
                Jam tidur: {selectedEntry.sleepHabits?.sleepTime} - {selectedEntry.sleepHabits?.wakeTime} (
                {selectedEntry.sleepHabits?.durationHours} jam) · Kualitas: {selectedEntry.sleepHabits?.sleepQuality}
                /10
              </p>
              <p className="text-stone-600">
                Kafein: {selectedEntry.sleepHabits?.caffeine || '-'} · Olahraga:{' '}
                {selectedEntry.sleepHabits?.exerciseMinutes || 0} menit · Makan teratur:{' '}
                {selectedEntry.sleepHabits?.regularMeals ? 'Ya' : 'Tidak'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
