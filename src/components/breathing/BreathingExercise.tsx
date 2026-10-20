import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { BreathingStepLog } from '../../types/journal';

interface BreathingExerciseProps {
  logs: BreathingStepLog[];
  onChange: (logs: BreathingStepLog[]) => void;
}

export const BreathingExercise: React.FC<BreathingExerciseProps> = ({ logs, onChange }) => {
  const [selectedDuration, setSelectedDuration] = useState<number>(3); // minutes
  const [isActive, setIsActive] = useState<boolean>(false);
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState<number>(4);
  const [totalSecondsElapsed, setTotalSecondsElapsed] = useState<number>(0);
  const [completedSession, setCompletedSession] = useState<boolean>(false);

  // Form for logging
  const [logMinutes, setLogMinutes] = useState<number>(3);
  const [comfort, setComfort] = useState<'Ya' | 'Sedikit' | 'Tidak'>('Ya');
  const [changes, setChanges] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const INHALE_DURATION = 4;
  const EXHALE_DURATION = 6;
  const CYCLE_DURATION = INHALE_DURATION + EXHALE_DURATION; // 10s

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTotalSecondsElapsed((prev) => {
          const next = prev + 1;
          const targetSeconds = selectedDuration * 60;
          if (next >= targetSeconds) {
            setIsActive(false);
            setCompletedSession(true);
            setLogMinutes(selectedDuration);
            return targetSeconds;
          }
          return next;
        });

        setPhaseSecondsLeft((prev) => {
          if (prev <= 1) {
            // switch phase
            if (phase === 'inhale') {
              setPhase('exhale');
              return EXHALE_DURATION;
            } else {
              setPhase('inhale');
              return INHALE_DURATION;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, phase, selectedDuration]);

  const handleStart = () => {
    setIsActive(true);
    setPhase('inhale');
    setPhaseSecondsLeft(INHALE_DURATION);
    setCompletedSession(false);
  };

  const handleStop = () => {
    setIsActive(false);
    if (totalSecondsElapsed > 30) {
      setLogMinutes(Math.max(1, Math.round(totalSecondsElapsed / 60)));
      setCompletedSession(true);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setTotalSecondsElapsed(0);
    setPhase('inhale');
    setPhaseSecondsLeft(INHALE_DURATION);
    setCompletedSession(false);
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newLog: BreathingStepLog = {
      id: `br-${Date.now()}`,
      time: timeStr,
      durationMinutes: logMinutes,
      feltComfortable: comfort,
      perceivedChanges: changes.trim() || 'Merasa lebih tenang dan detak napas melambat.',
      notes: notes.trim(),
    };

    onChange([...logs, newLog]);
    setChanges('');
    setNotes('');
    setCompletedSession(false);
    setTotalSecondsElapsed(0);
  };

  const handleRemoveLog = (id: string) => {
    onChange(logs.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Peringatan Keamanan Medis */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-950 block mb-0.5">Petunjuk & Batasan Keamanan</span>
            Napas tidak perlu ditarik terlalu dalam atau dipaksa. Lakukan secara lembut dan wajar. Hentikan latihan jika Anda merasa pusing, sesak napas, atau rasa cemas justru meningkat. Beri tahu konselor Anda, dan segera hubungi tenaga medis atau IGD terdekat bila keluhan sesak napas berat atau terus berlanjut.
          </div>
        </div>
      </div>

      {/* Kontrol Pewaktu Napas */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 text-center shadow-xs">
        <div className="text-xs text-stone-500 mb-3">
          <span>Tarik napas 4 hitungan via hidung</span>
          <span className="mx-2">·</span>
          <span>Hembuskan 6 hitungan perlahan</span>
        </div>

        {/* Pilihan Durasi */}
        <div className="inline-flex items-center gap-1.5 p-1 bg-stone-100/80 rounded-xl mb-6">
          {[2, 3, 4, 5].map((mins) => (
            <button
              key={mins}
              type="button"
              disabled={isActive}
              onClick={() => {
                setSelectedDuration(mins);
                setTotalSecondsElapsed(0);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedDuration === mins
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {mins} Menit
            </button>
          ))}
        </div>

        {/* Lingkaran Animasi Napas */}
        <div className="relative flex items-center justify-center my-6 h-56">
          {/* Outer glow ring */}
          <div
            className={`absolute rounded-full transition-all duration-1000 ease-in-out ${
              isActive && phase === 'inhale'
                ? 'w-48 h-48 bg-emerald-100/60 scale-110'
                : isActive && phase === 'exhale'
                  ? 'w-36 h-36 bg-teal-50/70 scale-95'
                  : 'w-40 h-40 bg-stone-100/70'
            }`}
          />
          {/* Main circle */}
          <div
            className={`relative z-10 flex flex-col items-center justify-center rounded-full text-white shadow-md transition-all ease-in-out ${
              phase === 'inhale'
                ? 'w-36 h-36 bg-gradient-to-br from-emerald-600 to-teal-700 duration-[4000ms] scale-110'
                : 'w-36 h-36 bg-gradient-to-br from-teal-700 to-emerald-800 duration-[6000ms] scale-95'
            }`}
          >
            <span className="text-xs font-medium tracking-wide uppercase text-emerald-100">
              {isActive ? (phase === 'inhale' ? 'Tarik Napas' : 'Hembuskan') : 'Siap Mulai'}
            </span>
            <span className="text-3xl font-bold mt-1 font-mono tabular-nums">
              {isActive ? phaseSecondsLeft : `${selectedDuration}:00`}
            </span>
            <span className="text-[10px] text-emerald-100/80 mt-0.5">
              {isActive ? (phase === 'inhale' ? 'Lewat hidung' : 'Secara lembut') : '4s hirup / 6s hembus'}
            </span>
          </div>
        </div>

        {/* Total Elapsed & Buttons */}
        <div className="flex items-center justify-center gap-3">
          {!isActive ? (
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Mulai Latihan
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Selesai / Jeda
            </button>
          )}

          {totalSecondsElapsed > 0 && !isActive && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-stone-600 hover:text-stone-900 text-xs rounded-xl border border-stone-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Ulang
            </button>
          )}
        </div>

        <div className="text-[11px] text-stone-400 mt-3 font-mono tabular-nums">
          Waktu berjalan: {Math.floor(totalSecondsElapsed / 60)}:
          {String(totalSecondsElapsed % 60).padStart(2, '0')}
        </div>
      </div>

      {/* Form Pencatatan Sesi */}
      <div className="bg-stone-50/70 border border-stone-200/80 rounded-2xl p-5">
        <h4 className="text-sm font-semibold text-stone-900 mb-1">Catat Pengalaman Latihan Napas</h4>
        <p className="text-xs text-stone-500 mb-4">
          Anda dapat menambahkan catatan setelah menyelesaikan sesi napas atau mencatat latihan mandiri yang dilakukan hari ini.
        </p>

        <form onSubmit={handleAddLog} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Lama Latihan (Menit)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={logMinutes}
                onChange={(e) => setLogMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Terasa Nyaman?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Ya', 'Sedikit', 'Tidak'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setComfort(opt)}
                    className={`py-2 text-xs font-medium rounded-xl border transition-colors ${
                      comfort === opt
                        ? 'bg-emerald-800 text-white border-emerald-800'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Perubahan yang Dirasakan
            </label>
            <input
              type="text"
              placeholder="Contoh: Dada terasa lebih lapang, pikiran tidak lagi terburu-buru"
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Sempat batuk di menit ke-2, lalu minum air putih"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              + Simpan Catatan Latihan Napas
            </button>
          </div>
        </form>
      </div>

      {/* Riwayat Catatan Napas Hari Ini */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-stone-500">
            Catatan Napas Hari Ini ({logs.length})
          </span>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-white border border-stone-200/80 rounded-xl p-3 flex items-start justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 text-stone-500 text-[11px] mb-1">
                    <span className="font-semibold text-stone-800">{log.time}</span>
                    <span>·</span>
                    <span>{log.durationMinutes} menit</span>
                    <span>·</span>
                    <span>Kenyamanan: {log.feltComfortable}</span>
                  </div>
                  <p className="text-stone-800">{log.perceivedChanges}</p>
                  {log.notes && <p className="text-stone-500 text-[11px] mt-0.5">{log.notes}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveLog(log.id)}
                  className="text-stone-400 hover:text-rose-600 text-xs px-2 py-1 ml-2"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
