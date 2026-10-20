import React, { useState, useEffect } from 'react';
import {
  Smile,
  Compass,
  Wind,
  Activity,
  Brain,
  Moon,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  Send,
  HelpCircle,
  Calendar,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { DailyJournalEntry, SymptomItem, ThoughtRecordItem, SafetyNoteItem } from '../../types/journal';
import { BreathingExercise } from '../breathing/BreathingExercise';
import { GroundingExercise } from '../grounding/GroundingExercise';
import { saveLocalDraft, getLocalDraft, clearLocalDraft } from '../../services/api';

interface JournalFormProps {
  initialDate: string;
  initialEntry?: DailyJournalEntry | null;
  onSave: (date: string, entry: Partial<DailyJournalEntry>, isSubmit: boolean) => Promise<void>;
  onDateChange: (newDate: string) => void;
  onSafetyTriggered: (reasons: string[]) => void;
}

const EMOTION_CHIPS = [
  'sedih',
  'cemas',
  'marah',
  'takut',
  'kesepian',
  'bersalah',
  'malu',
  'lelah',
  'kosong',
  'tenang',
  'lega',
  'senang',
  'bersyukur',
];

export const JournalForm: React.FC<JournalFormProps> = ({
  initialDate,
  initialEntry,
  onSave,
  onDateChange,
  onSafetyTriggered,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [openSection, setOpenSection] = useState<string>('A');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Form states initialized
  const [morningMood, setMorningMood] = useState<number>(5);
  const [afternoonMood, setAfternoonMood] = useState<number>(5);
  const [eveningMood, setEveningMood] = useState<number>(5);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [otherEmotion, setOtherEmotion] = useState<string>('');
  const [moodNote, setMoodNote] = useState<string>('');

  const [groundingLogs, setGroundingLogs] = useState(initialEntry?.grounding?.logs || []);
  const [breathingLogs, setBreathingLogs] = useState(initialEntry?.breathing?.logs || []);

  const [symptoms, setSymptoms] = useState<SymptomItem[]>([]);
  const [symptomPatterns, setSymptomPatterns] = useState<string>('');

  const [thoughts, setThoughts] = useState<ThoughtRecordItem[]>([]);

  const [sleepTime, setSleepTime] = useState<string>('23:00');
  const [wakeTime, setWakeTime] = useState<string>('06:30');
  const [sleepDuration, setSleepDuration] = useState<number>(7.5);
  const [frequentAwake, setFrequentAwake] = useState<boolean>(false);
  const [sleepQuality, setSleepQuality] = useState<number>(7);
  const [caffeine, setCaffeine] = useState<string>('');
  const [exerciseMins, setExerciseMins] = useState<number>(0);
  const [regularMeals, setRegularMeals] = useState<boolean>(true);

  const [safetyItems, setSafetyItems] = useState<SafetyNoteItem[]>([]);
  const [entryStatus, setEntryStatus] = useState<'draft' | 'submitted'>('draft');

  // Load existing or draft
  useEffect(() => {
    setSelectedDate(initialDate);
    const draft = getLocalDraft(initialDate);
    const data = initialEntry || draft;

    if (data) {
      if (data.moodCheckIn) {
        setMorningMood(data.moodCheckIn.moodMorning ?? 5);
        setAfternoonMood(data.moodCheckIn.moodAfternoon ?? 5);
        setEveningMood(data.moodCheckIn.moodEvening ?? 5);
        setEmotions(data.moodCheckIn.dominantEmotions || []);
        setOtherEmotion(data.moodCheckIn.otherEmotion || '');
        setMoodNote(data.moodCheckIn.moodNote || '');
      }
      setGroundingLogs(data.grounding?.logs || []);
      setBreathingLogs(data.breathing?.logs || []);
      setSymptoms(data.symptoms?.items || []);
      setSymptomPatterns(data.symptoms?.patternsNoticed || '');
      setThoughts(data.thoughts?.items || []);

      if (data.sleepHabits) {
        setSleepTime(data.sleepHabits.sleepTime || '23:00');
        setWakeTime(data.sleepHabits.wakeTime || '06:30');
        setSleepDuration(data.sleepHabits.durationHours ?? 7.5);
        setFrequentAwake(!!data.sleepHabits.frequentAwakening);
        setSleepQuality(data.sleepHabits.sleepQuality ?? 7);
        setCaffeine(data.sleepHabits.caffeine || '');
        setExerciseMins(data.sleepHabits.exerciseMinutes ?? 0);
        setRegularMeals(data.sleepHabits.regularMeals ?? true);
      }

      setSafetyItems(data.safety?.items || []);
      setEntryStatus(data.status || 'draft');
    } else {
      // reset defaults
      setMorningMood(5);
      setAfternoonMood(5);
      setEveningMood(5);
      setEmotions([]);
      setOtherEmotion('');
      setMoodNote('');
      setGroundingLogs([]);
      setBreathingLogs([]);
      setSymptoms([]);
      setSymptomPatterns('');
      setThoughts([]);
      setSleepTime('23:00');
      setWakeTime('06:30');
      setSleepDuration(7.5);
      setFrequentAwake(false);
      setSleepQuality(7);
      setCaffeine('');
      setExerciseMins(0);
      setRegularMeals(true);
      setSafetyItems([]);
      setEntryStatus('draft');
    }
  }, [initialDate, initialEntry]);

  // Auto calculate sleep duration
  useEffect(() => {
    if (!sleepTime || !wakeTime) return;
    const [sH, sM] = sleepTime.split(':').map(Number);
    const [wH, wM] = wakeTime.split(':').map(Number);
    if (!isNaN(sH) && !isNaN(wH)) {
      let diffMins = (wH * 60 + (wM || 0)) - (sH * 60 + (sM || 0));
      if (diffMins < 0) diffMins += 24 * 60; // crossed midnight
      const hrs = Number((diffMins / 60).toFixed(1));
      setSleepDuration(hrs);
    }
  }, [sleepTime, wakeTime]);

  // Construct current payload
  const buildCurrentPayload = (status: 'draft' | 'submitted'): Partial<DailyJournalEntry> => {
    return {
      date: selectedDate,
      status,
      moodCheckIn: {
        moodMorning: morningMood,
        moodAfternoon: afternoonMood,
        moodEvening: eveningMood,
        dominantEmotions: emotions,
        otherEmotion: otherEmotion.trim() || undefined,
        moodNote: moodNote.trim(),
      },
      grounding: { logs: groundingLogs },
      breathing: { logs: breathingLogs },
      symptoms: {
        items: symptoms,
        patternsNoticed: symptomPatterns.trim(),
      },
      thoughts: { items: thoughts },
      sleepHabits: {
        sleepTime,
        wakeTime,
        durationHours: sleepDuration,
        frequentAwakening: frequentAwake,
        sleepQuality,
        caffeine: caffeine.trim(),
        exerciseMinutes: exerciseMins,
        regularMeals,
      },
      safety: { items: safetyItems },
    };
  };

  // Auto-save local draft
  useEffect(() => {
    const payload = buildCurrentPayload('draft');
    saveLocalDraft(selectedDate, payload);
  }, [
    selectedDate,
    morningMood,
    afternoonMood,
    eveningMood,
    emotions,
    otherEmotion,
    moodNote,
    groundingLogs,
    breathingLogs,
    symptoms,
    symptomPatterns,
    thoughts,
    sleepTime,
    wakeTime,
    sleepDuration,
    frequentAwake,
    sleepQuality,
    caffeine,
    exerciseMins,
    regularMeals,
    safetyItems,
  ]);

  const handleToggleEmotion = (emotion: string) => {
    if (emotions.includes(emotion)) {
      setEmotions(emotions.filter((e) => e !== emotion));
    } else {
      setEmotions([...emotions, emotion]);
    }
  };

  // Add symptom row
  const handleAddSymptom = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setSymptoms([
      ...symptoms,
      {
        id: `sym-${Date.now()}`,
        time: timeStr,
        symptom: '',
        intensity: 5,
        triggerSituation: '',
        actionTaken: '',
        whatHelped: '',
        duration: '',
      },
    ]);
  };

  // Add thought record
  const handleAddThought = () => {
    setThoughts([
      ...thoughts,
      {
        id: `th-${Date.now()}`,
        situation: '',
        automaticThoughts: '',
        emotions: '',
        emotionIntensity: 6,
        bodyReaction: '',
        alternativePerspective: '',
        feelingAfterwards: 5,
      },
    ]);
  };

  // Add safety item
  const handleAddSafety = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setSafetyItems([
      ...safetyItems,
      {
        id: `safe-${Date.now()}`,
        time: timeStr,
        whatHappened: '',
        worryLevel: 5,
        actionTaken: '',
        contactedWhom: '',
      },
    ]);
  };

  const handlePerformSave = async (isSubmit: boolean) => {
    setSaving(true);
    setSaveSuccessMsg(null);
    try {
      const payload = buildCurrentPayload(isSubmit ? 'submitted' : 'draft');
      await onSave(selectedDate, payload, isSubmit);
      setEntryStatus(isSubmit ? 'submitted' : 'draft');
      if (isSubmit) {
        clearLocalDraft(selectedDate);
      }
      setSaveSuccessMsg(isSubmit ? 'Jurnal berhasil dikirimkan ke konselor!' : 'Draf tersimpan dengan aman.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Calculate allowable dates (today back to 7 days)
  const availableDates: { date: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label =
      i === 0
        ? 'Hari Ini'
        : i === 1
          ? 'Kemarin'
          : d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    availableDates.push({ date: dateStr, label });
  }

  // Count filled sections for progress
  let filledCount = 0;
  if (moodNote || emotions.length > 0) filledCount++;
  if (groundingLogs.length > 0) filledCount++;
  if (breathingLogs.length > 0) filledCount++;
  if (symptoms.length > 0) filledCount++;
  if (thoughts.length > 0) filledCount++;
  if (sleepQuality > 0 || sleepDuration > 0) filledCount++;
  if (safetyItems.length > 0) filledCount++;

  return (
    <div className="space-y-6 pb-24">
      {/* Header bar tanggal dan progress */}
      <div className="bg-white border border-stone-200/80 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-stone-500 text-xs mb-1">
              <Calendar className="w-4 h-4 text-emerald-800" />
              <span>Tanggal Pengisian Jurnal</span>
              <span>·</span>
              <span className="capitalize">{entryStatus === 'submitted' ? 'Terkirim' : 'Draf Tersimpan'}</span>
            </div>
            <h2 className="text-lg font-bold text-stone-900">
              {new Date(selectedDate).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h2>
          </div>

          {/* Quick Date Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {availableDates.map((item) => (
              <button
                key={item.date}
                type="button"
                onClick={() => {
                  setSelectedDate(item.date);
                  onDateChange(item.date);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-colors ${
                  selectedDate === item.date
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
          <span>Kemajuan Pengisian Hari Ini</span>
          <span className="font-semibold text-emerald-900">{filledCount} dari 7 Bagian Terisi</span>
        </div>
        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-700 transition-all duration-300"
            style={{ width: `${(filledCount / 7) * 100}%` }}
          />
        </div>
        <p className="text-[11px] text-stone-400 mt-2">
          Anda bebas mengisi bagian yang relevan dan melewati bagian yang tidak diperlukan hari ini.
        </p>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Accordion Sections A - G */}
      <div className="space-y-3">
        {/* SECTION A */}
        <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === 'A' ? '' : 'A')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Smile className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-900 block">Bagian A</span>
                <h3 className="text-sm font-bold text-stone-900">Check-in Suasana Hati Harian</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(moodNote || emotions.length > 0) && (
                <span className="text-[11px] text-emerald-800 font-medium">Terisi</span>
              )}
              {openSection === 'A' ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
            </div>
          </button>

          {openSection === 'A' && (
            <div className="p-5 border-t border-stone-100 space-y-5">
              {/* Sliders Pagi Siang Malam */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-stone-50/70 p-3.5 rounded-2xl border border-stone-200/70">
                  <div className="flex justify-between text-xs text-stone-700 mb-1.5">
                    <span className="font-semibold">Suasana Pagi:</span>
                    <span className="font-mono font-bold text-emerald-900">{morningMood}/10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={morningMood}
                    onChange={(e) => setMorningMood(Number(e.target.value))}
                    className="w-full accent-emerald-800"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                    <span>0: Sangat buruk</span>
                    <span>10: Sangat baik</span>
                  </div>
                </div>

                <div className="bg-stone-50/70 p-3.5 rounded-2xl border border-stone-200/70">
                  <div className="flex justify-between text-xs text-stone-700 mb-1.5">
                    <span className="font-semibold">Suasana Siang:</span>
                    <span className="font-mono font-bold text-emerald-900">{afternoonMood}/10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={afternoonMood}
                    onChange={(e) => setAfternoonMood(Number(e.target.value))}
                    className="w-full accent-emerald-800"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                    <span>0: Sangat buruk</span>
                    <span>10: Sangat baik</span>
                  </div>
                </div>

                <div className="bg-stone-50/70 p-3.5 rounded-2xl border border-stone-200/70">
                  <div className="flex justify-between text-xs text-stone-700 mb-1.5">
                    <span className="font-semibold">Suasana Malam:</span>
                    <span className="font-mono font-bold text-emerald-900">{eveningMood}/10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={eveningMood}
                    onChange={(e) => setEveningMood(Number(e.target.value))}
                    className="w-full accent-emerald-800"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                    <span>0: Sangat buruk</span>
                    <span>10: Sangat baik</span>
                  </div>
                </div>
              </div>

              {/* Emosi Chips */}
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-2">
                  Emosi yang Paling Terasa Hari Ini (Boleh Pilih Beberapa)
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOTION_CHIPS.map((chip) => {
                    const selected = emotions.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleToggleEmotion(chip)}
                        className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
                          selected
                            ? 'bg-emerald-800 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200/80'
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lainnya & Catatan Singkat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Emosi Lainnya (Jika Ada)
                  </label>
                  <input
                    type="text"
                    placeholder="Tuliskan emosi lain yang Anda rasakan..."
                    value={otherEmotion}
                    onChange={(e) => setOtherEmotion(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Catatan Singkat Suasana Hati
                  </label>
                  <input
                    type="text"
                    placeholder="Gambarkan hari Anda dalam 1-2 kalimat..."
                    value={moodNote}
                    onChange={(e) => setMoodNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION B */}
        <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === 'B' ? '' : 'B')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-900 block">Bagian B</span>
                <h3 className="text-sm font-bold text-stone-900">Latihan Grounding 5-4-3-2-1</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {groundingLogs.length > 0 && (
                <span className="text-[11px] text-emerald-800 font-medium">
                  {groundingLogs.length} Sesi Tercatat
                </span>
              )}
              {openSection === 'B' ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
            </div>
          </button>

          {openSection === 'B' && (
            <div className="p-5 border-t border-stone-100">
              <GroundingExercise logs={groundingLogs} onChange={setGroundingLogs} />
            </div>
          )}
        </div>

        {/* SECTION C */}
        <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === 'C' ? '' : 'C')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-800 flex items-center justify-center">
                <Wind className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-900 block">Bagian C</span>
                <h3 className="text-sm font-bold text-stone-900">Latihan Napas Lembut</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {breathingLogs.length > 0 && (
                <span className="text-[11px] text-emerald-800 font-medium">
                  {breathingLogs.length} Sesi Tercatat
                </span>
              )}
              {openSection === 'C' ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
            </div>
          </button>

          {openSection === 'C' && (
            <div className="p-5 border-t border-stone-100">
              <BreathingExercise logs={breathingLogs} onChange={setBreathingLogs} />
            </div>
          )}
        </div>

        {/* SECTION D */}
        <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === 'D' ? '' : 'D')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-900 block">Bagian D</span>
                <h3 className="text-sm font-bold text-stone-900">Catatan Gejala</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {symptoms.length > 0 && (
                <span className="text-[11px] text-emerald-800 font-medium">
                  {symptoms.length} Gejala
                </span>
              )}
              {openSection === 'D' ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
            </div>
          </button>

          {openSection === 'D' && (
            <div className="p-5 border-t border-stone-100 space-y-4">
              <p className="text-xs text-stone-500">
                Catat bila Anda mengalami sensasi fisik, perasaan, atau pikiran yang tidak nyaman (contoh: panik, sesak napas, jantung berdebar kencang, sedih mendalam, sulit konsentrasi, mudah tersulut emosi).
              </p>

              {symptoms.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-stone-50/70 border border-stone-200/80 rounded-2xl p-4 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800">
                      Gejala #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSymptoms(symptoms.filter((s) => s.id !== item.id))}
                      className="text-stone-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Jam Kejadian
                      </label>
                      <input
                        type="time"
                        value={item.time}
                        onChange={(e) => {
                          const updated = [...symptoms];
                          updated[index].time = e.target.value;
                          setSymptoms(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Gejala / Sensasi yang Muncul
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Jantung berdebar, napas pendek, rasa panik"
                        value={item.symptom}
                        onChange={(e) => {
                          const updated = [...symptoms];
                          updated[index].symptom = e.target.value;
                          setSymptoms(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-stone-600 mb-1">
                      <span>Seberapa Kuat (Intensitas):</span>
                      <span className="font-semibold font-mono text-stone-900">{item.intensity}/10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={item.intensity}
                      onChange={(e) => {
                        const updated = [...symptoms];
                        updated[index].intensity = Number(e.target.value);
                        setSymptoms(updated);
                      }}
                      className="w-full accent-amber-700"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>0: Sangat ringan</span>
                      <span>10: Sangat tak tertahankan</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Situasi / Kejadian Sebelumnya
                      </label>
                      <input
                        type="text"
                        placeholder="Apa yang sedang terjadi sebelumnya?"
                        value={item.triggerSituation}
                        onChange={(e) => {
                          const updated = [...symptoms];
                          updated[index].triggerSituation = e.target.value;
                          setSymptoms(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Berapa Lama Berlangsung?
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 15 menit, 1 jam"
                        value={item.duration}
                        onChange={(e) => {
                          const updated = [...symptoms];
                          updated[index].duration = e.target.value;
                          setSymptoms(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Apa yang Saya Lakukan?
                      </label>
                      <input
                        type="text"
                        placeholder="Tindakan atau reaksi saya..."
                        value={item.actionTaken}
                        onChange={(e) => {
                          const updated = [...symptoms];
                          updated[index].actionTaken = e.target.value;
                          setSymptoms(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Apa yang Membantu Meredakan?
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Minum air putih hangat, duduk santai"
                        value={item.whatHelped}
                        onChange={(e) => {
                          const updated = [...symptoms];
                          updated[index].whatHelped = e.target.value;
                          setSymptoms(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddSymptom}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Gejala
              </button>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Pola yang Saya Perhatikan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Gejala sering muncul di jam sibuk sore, saat kurang tidur, atau setelah minum kopi berlebih."
                  value={symptomPatterns}
                  onChange={(e) => setSymptomPatterns(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>
            </div>
          )}
        </div>

        {/* SECTION E */}
        <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === 'E' ? '' : 'E')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-800 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-900 block">Bagian E</span>
                <h3 className="text-sm font-bold text-stone-900">Catatan Pikiran</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {thoughts.length > 0 && (
                <span className="text-[11px] text-emerald-800 font-medium">
                  {thoughts.length} Catatan Pikiran
                </span>
              )}
              {openSection === 'E' ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
            </div>
          </button>

          {openSection === 'E' && (
            <div className="p-5 border-t border-stone-100 space-y-4">
              {/* Petunjuk & Pertanyaan Bantu */}
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-950">
                <div className="flex items-center gap-2 font-semibold text-indigo-900 mb-2">
                  <HelpCircle className="w-4 h-4" />
                  <span>Pertanyaan Bantu Refleksi Kognitif:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-indigo-900/90 leading-relaxed">
                  <div>• Apa bukti nyata yang mendukung pikiran otomatis ini?</div>
                  <div>• Apa bukti yang TIDAK mendukung pikiran ini?</div>
                  <div>• Apa penjelasan atau sudut pandang lain yang masuk akal?</div>
                  <div>• Apa yang akan saya katakan jika sahabat baik saya mengalami hal ini?</div>
                </div>
              </div>

              {thoughts.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-stone-50/70 border border-stone-200/80 rounded-2xl p-4 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800">
                      Pikiran #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setThoughts(thoughts.filter((t) => t.id !== item.id))}
                      className="text-stone-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      Situasi (Apa yang terjadi, di mana, dengan siapa?)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Sedang menunggu balasan pesan dari rekan kerja"
                      value={item.situation}
                      onChange={(e) => {
                        const updated = [...thoughts];
                        updated[index].situation = e.target.value;
                        setThoughts(updated);
                      }}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      Pikiran Otomatis yang Muncul di Kepala
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 'Dia pasti marah pada saya dan saya berbuat salah besar.'"
                      value={item.automaticThoughts}
                      onChange={(e) => {
                        const updated = [...thoughts];
                        updated[index].automaticThoughts = e.target.value;
                        setThoughts(updated);
                      }}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Emosi yang Timbul
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Takut, cemas, malu"
                        value={item.emotions}
                        onChange={(e) => {
                          const updated = [...thoughts];
                          updated[index].emotions = e.target.value;
                          setThoughts(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-stone-600 mb-1">
                        <span>Kekuatan Emosi:</span>
                        <span className="font-semibold font-mono text-stone-900">{item.emotionIntensity}/10</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={item.emotionIntensity}
                        onChange={(e) => {
                          const updated = [...thoughts];
                          updated[index].emotionIntensity = Number(e.target.value);
                          setThoughts(updated);
                        }}
                        className="w-full accent-indigo-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      Reaksi Tubuh / Tindakan Saya
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Perut tegang, mengecek HP berulang kali"
                      value={item.bodyReaction}
                      onChange={(e) => {
                        const updated = [...thoughts];
                        updated[index].bodyReaction = e.target.value;
                        setThoughts(updated);
                      }}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      Sudut Pandang Lain yang Mungkin (&ldquo;Bagaimana jika sahabat saya mengalami ini?&rdquo;)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Mungkin dia sedang rapat padat atau dalam perjalanan. Bukan berarti dia kecewa pada saya."
                      value={item.alternativePerspective}
                      onChange={(e) => {
                        const updated = [...thoughts];
                        updated[index].alternativePerspective = e.target.value;
                        setThoughts(updated);
                      }}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-stone-600 mb-1">
                      <span>Perasaan Setelah Menulis Sudut Pandang Alternatif:</span>
                      <span className="font-semibold font-mono text-emerald-800">{item.feelingAfterwards}/10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={item.feelingAfterwards}
                      onChange={(e) => {
                        const updated = [...thoughts];
                        updated[index].feelingAfterwards = Number(e.target.value);
                        setThoughts(updated);
                      }}
                      className="w-full accent-emerald-800"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>0: Sangat tertekan</span>
                      <span>10: Sangat lega / tenang</span>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddThought}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Catatan Pikiran
              </button>
            </div>
          )}
        </div>

        {/* SECTION F */}
        <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === 'F' ? '' : 'F')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-900 block">Bagian F</span>
                <h3 className="text-sm font-bold text-stone-900">Catatan Tidur dan Kebiasaan Harian</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-800 font-medium">
                {sleepDuration} Jam Tidur
              </span>
              {openSection === 'F' ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
            </div>
          </button>

          {openSection === 'F' && (
            <div className="p-5 border-t border-stone-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Jam Tidur Malam
                  </label>
                  <input
                    type="time"
                    value={sleepTime}
                    onChange={(e) => setSleepTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Jam Bangun Pagi
                  </label>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Lama Tidur (Jam)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={sleepDuration}
                    onChange={(e) => setSleepDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-stone-50/70 p-3.5 rounded-2xl border border-stone-200/70">
                  <div className="flex justify-between text-xs text-stone-700 mb-1.5">
                    <span className="font-semibold">Kualitas Tidur:</span>
                    <span className="font-mono font-bold text-emerald-900">{sleepQuality}/10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(Number(e.target.value))}
                    className="w-full accent-purple-800"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                    <span>0: Sangat gelisah</span>
                    <span>10: Sangat nyenyak</span>
                  </div>
                </div>

                <div className="bg-stone-50/70 p-3.5 rounded-2xl border border-stone-200/70 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-stone-700 mb-1.5">
                    Apakah Sering Terbangun di Malam Hari?
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFrequentAwake(true)}
                      className={`py-2 text-xs font-medium rounded-xl border transition-colors ${
                        frequentAwake
                          ? 'bg-purple-800 text-white border-purple-800'
                          : 'bg-white text-stone-700 border-stone-200'
                      }`}
                    >
                      Ya, Sering
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrequentAwake(false)}
                      className={`py-2 text-xs font-medium rounded-xl border transition-colors ${
                        !frequentAwake
                          ? 'bg-emerald-800 text-white border-emerald-800'
                          : 'bg-white text-stone-700 border-stone-200'
                      }`}
                    >
                      Tidak
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Konsumsi Kafein
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: 2 cangkir kopi, 1 teh"
                    value={caffeine}
                    onChange={(e) => setCaffeine(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Olahraga / Gerak Tubuh (Menit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    placeholder="0"
                    value={exerciseMins}
                    onChange={(e) => setExerciseMins(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Pola Makan Teratur Hari Ini?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegularMeals(true)}
                      className={`py-2 text-xs font-medium rounded-xl border transition-colors ${
                        regularMeals
                          ? 'bg-emerald-800 text-white border-emerald-800'
                          : 'bg-white text-stone-700 border-stone-200'
                      }`}
                    >
                      Ya, Teratur
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegularMeals(false)}
                      className={`py-2 text-xs font-medium rounded-xl border transition-colors ${
                        !regularMeals
                          ? 'bg-amber-800 text-white border-amber-800'
                          : 'bg-white text-stone-700 border-stone-200'
                      }`}
                    >
                      Tidak Teratur
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION G */}
        <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === 'G' ? '' : 'G')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-900 block">Bagian G</span>
                <h3 className="text-sm font-bold text-stone-900">Catatan Keselamatan</h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {safetyItems.length > 0 && (
                <span className="text-[11px] text-rose-700 font-semibold">
                  {safetyItems.length} Catatan Diwaspadai
                </span>
              )}
              {openSection === 'G' ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
            </div>
          </button>

          {openSection === 'G' && (
            <div className="p-5 border-t border-stone-100 space-y-4">
              {/* Tanda-tanda waspada */}
              <div className="bg-rose-50/60 border border-rose-200/60 rounded-2xl p-4 text-xs text-rose-950">
                <span className="font-semibold block mb-1">
                  Tanda-tanda yang Perlu Diwaspadai Bersama:
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-rose-900/90 leading-relaxed list-disc list-inside">
                  <li>Kebingungan atau kehilangan orientasi waktu/tempat</li>
                  <li>Pusing berat, pingsan, atau sesak napas yang tidak membaik</li>
                  <li>Mendengar atau melihat hal yang tidak dilihat orang lain</li>
                  <li>Hampir tidak tidur beberapa hari disertai energi berlebihan</li>
                  <li>Pikiran menyakiti diri, mengakhiri hidup, atau menyakiti orang lain</li>
                  <li>Merasa tidak aman berada di rumah atau lingkungan saat ini</li>
                </ul>
              </div>

              {safetyItems.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-stone-50/70 border border-rose-100 rounded-2xl p-4 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-950">
                      Catatan Keselamatan #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSafetyItems(safetyItems.filter((s) => s.id !== item.id))}
                      className="text-stone-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Jam Kejadian
                      </label>
                      <input
                        type="time"
                        value={item.time}
                        onChange={(e) => {
                          const updated = [...safetyItems];
                          updated[index].time = e.target.value;
                          setSafetyItems(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Apa yang Terjadi?
                      </label>
                      <input
                        type="text"
                        placeholder="Deskripsikan kejadian atau pikiran yang mengkhawatirkan..."
                        value={item.whatHappened}
                        onChange={(e) => {
                          const updated = [...safetyItems];
                          updated[index].whatHappened = e.target.value;
                          setSafetyItems(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-stone-600 mb-1">
                      <span>Seberapa Mengkhawatirkan (Tingkat Risiko):</span>
                      <span className="font-semibold font-mono text-rose-800">{item.worryLevel}/10</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={item.worryLevel}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const updated = [...safetyItems];
                        updated[index].worryLevel = val;
                        setSafetyItems(updated);
                        if (val >= 7) {
                          onSafetyTriggered([`Skor kekhawatiran ${val}/10 pada catatan keselamatan.`]);
                        }
                      }}
                      className="w-full accent-rose-700"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>0: Tidak mengkhawatirkan</span>
                      <span>10: Sangat mengkhawatirkan (Darurat)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Apa yang Saya Lakukan?
                      </label>
                      <input
                        type="text"
                        placeholder="Langkah pengamanan diri yang diambil..."
                        value={item.actionTaken}
                        onChange={(e) => {
                          const updated = [...safetyItems];
                          updated[index].actionTaken = e.target.value;
                          setSafetyItems(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Siapa yang Saya Hubungi / Temani?
                      </label>
                      <input
                        type="text"
                        placeholder="Keluarga, sahabat terpercaya, atau staf..."
                        value={item.contactedWhom}
                        onChange={(e) => {
                          const updated = [...safetyItems];
                          updated[index].contactedWhom = e.target.value;
                          setSafetyItems(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddSafety}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-xl border border-rose-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Catatan Keselamatan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating / Sticky Bottom CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-stone-100 via-stone-100/90 to-transparent z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => handlePerformSave(false)}
            className="flex-1 py-3 px-4 bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 rounded-2xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4 text-stone-500" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Draf'}</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handlePerformSave(true)}
            className="flex-1 py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl text-xs font-semibold shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Send className="w-4 h-4 text-emerald-100" />
            <span>{saving ? 'Mengirim...' : 'Kirim Jurnal Hari Ini'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
