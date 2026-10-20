import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Download,
  Calendar,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  FileSpreadsheet,
  Settings,
  UserPlus,
  Trash2,
  Eye,
  RefreshCw,
  Share2,
  Activity,
  Brain,
  Moon,
  Compass,
} from 'lucide-react';
import {
  KonseliSummary,
  DailyJournalEntry,
  WeeklyAnalysisRecord,
  CounselorConfig,
} from '../../types/journal';
import { api } from '../../services/api';

interface CounselorDashboardProps {
  isAdmin: boolean;
  currentUserEmail: string;
}

export const CounselorDashboard: React.FC<CounselorDashboardProps> = ({
  isAdmin,
  currentUserEmail,
}) => {
  const [activeTab, setActiveTab] = useState<'triage' | 'detail' | 'analysis' | 'overview' | 'settings' | 'users'>(
    'triage'
  );

  const [konseliList, setKonseliList] = useState<KonseliSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'urgent' | 'inactive'>('all');

  // Selected Konseli Detail
  const [selectedKonseliEmail, setSelectedKonseliEmail] = useState<string>('');
  const [detailEntries, setDetailEntries] = useState<DailyJournalEntry[]>([]);
  const [detailAnalyses, setDetailAnalyses] = useState<WeeklyAnalysisRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [selectedDetailEntry, setSelectedDetailEntry] = useState<DailyJournalEntry | null>(null);

  // Weekly Analysis Sub-state
  const [targetWeekId, setTargetWeekId] = useState<string>('');
  const [weekStartDate, setWeekStartDate] = useState<string>('');
  const [weekEndDate, setWeekEndDate] = useState<string>('');
  const [currentAnalysis, setCurrentAnalysis] = useState<WeeklyAnalysisRecord | null>(null);
  const [generatingAnalysis, setGeneratingAnalysis] = useState<boolean>(false);
  const [counselorNotesInput, setCounselorNotesInput] = useState<string>('');
  const [analysisStatus, setAnalysisStatus] = useState<'draft' | 'approved'>('draft');
  const [sharedWithClient, setSharedWithClient] = useState<boolean>(false);

  // Settings & Admin Users
  const [emergencyHotline, setEmergencyHotline] = useState<string>('119');
  const [counselorContact, setCounselorContact] = useState<string>('0812-3456-7890');
  const [counselorEmails, setCounselorEmails] = useState<string[]>([]);
  const [newCounselorInput, setNewCounselorInput] = useState<string>('');
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);

  // Load konseli triage list
  const loadKonseliList = async () => {
    setLoading(true);
    try {
      const res = await api.getCounselorKonseliList();
      setKonseliList(res.konseli);
      if (res.konseli.length > 0 && !selectedKonseliEmail) {
        setSelectedKonseliEmail(res.konseli[0].email);
      }
    } catch (err) {
      console.error('Error loading konseli list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKonseliList();
    // Default current week
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(now.setDate(diff + 6));

    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];
    setWeekStartDate(mondayStr);
    setWeekEndDate(sundayStr);
    setTargetWeekId(`2026-W${Math.ceil((now.getDate() + 6) / 7)}`);
  }, []);

  // Load detail for selected konseli
  const loadKonseliDetail = async (email: string) => {
    setSelectedKonseliEmail(email);
    setDetailLoading(true);
    try {
      const res = await api.getKonseliDetail(email);
      setDetailEntries(res.entries);
      setDetailAnalyses(res.analyses);
      if (res.analyses.length > 0) {
        const latest = res.analyses[res.analyses.length - 1];
        setCurrentAnalysis(latest);
        setCounselorNotesInput(latest.counselorNotes || '');
        setAnalysisStatus(latest.status);
        setSharedWithClient(latest.sharedWithClient);
      } else {
        setCurrentAnalysis(null);
      }
    } catch (err) {
      console.error('Error loading konseli detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedKonseliEmail && (activeTab === 'detail' || activeTab === 'analysis')) {
      loadKonseliDetail(selectedKonseliEmail);
    }
  }, [selectedKonseliEmail, activeTab]);

  // Load settings & users
  useEffect(() => {
    if (activeTab === 'settings' || activeTab === 'users') {
      api.getStatus().then((st) => {
        if (st.emergencySettings?.emergencyNumber) setEmergencyHotline(st.emergencySettings.emergencyNumber);
        if (st.emergencySettings?.counselorContact) setCounselorContact(st.emergencySettings.counselorContact);
      });
      if (isAdmin) {
        api.getAdminUsers().then((u) => setCounselorEmails(u.counselorEmails));
      }
    }
  }, [activeTab, isAdmin]);

  // Filtered konseli list
  const filteredKonseli = konseliList.filter((k) => {
    const matchesSearch =
      k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'urgent') return k.attentionLevel === 'segera' || k.attentionLevel === 'tinggi';
    if (filterType === 'inactive') return k.daysSinceLastEntry >= 3;
    return true;
  });

  // Generate AI weekly analysis
  const handleGenerateAnalysis = async () => {
    if (!selectedKonseliEmail || !weekStartDate || !weekEndDate) return;
    setGeneratingAnalysis(true);
    try {
      const res = await api.generateWeeklyAnalysis(
        selectedKonseliEmail,
        targetWeekId,
        weekStartDate,
        weekEndDate
      );
      setCurrentAnalysis(res.analysisRecord);
      setCounselorNotesInput(res.analysisRecord.counselorNotes || '');
      setAnalysisStatus(res.analysisRecord.status);
      setSharedWithClient(res.analysisRecord.sharedWithClient);
      loadKonseliDetail(selectedKonseliEmail);
    } catch (err: any) {
      alert(err.message || 'Gagal menghasilkan analisis AI');
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  // Update counselor notes / status
  const handleSaveAnalysisUpdates = async () => {
    if (!currentAnalysis) return;
    try {
      const res = await api.updateWeeklyAnalysis(currentAnalysis.weekId, selectedKonseliEmail, {
        counselorNotes: counselorNotesInput,
        status: analysisStatus,
        sharedWithClient,
      });
      setCurrentAnalysis(res.analysisRecord);
      alert('Analisis mingguan dan catatan konselor berhasil diperbarui.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add counselor
  const handleAddCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCounselorInput) return;
    try {
      const res = await api.addCounselor(newCounselorInput.trim());
      setCounselorEmails(res.counselorEmails);
      setNewCounselorInput('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Remove counselor
  const handleRemoveCounselor = async (email: string) => {
    if (!confirm(`Hapus ${email} dari daftar konselor?`)) return;
    try {
      const res = await api.removeCounselor(email);
      setCounselorEmails(res.counselorEmails);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save emergency settings
  const handleSaveEmergencySettings = async () => {
    try {
      await api.updateEmergencyConfig({
        emergencySettings: {
          emergencyNumber: emergencyHotline,
          hotlineName: 'Layanan Kesehatan Jiwa Kemenkes (Sejiwa)',
          hotlineExtension: '8',
          nearestHospitalNote: 'IGD Rumah Sakit terdekat',
          counselorContact,
        },
      });
      setSettingsSavedMsg('Pengaturan kontak darurat berhasil diperbarui.');
      setTimeout(() => setSettingsSavedMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (detailEntries.length === 0) {
      alert('Belum ada entri untuk diekspor.');
      return;
    }

    const headers = [
      'Tanggal',
      'Status',
      'Mood Pagi',
      'Mood Siang',
      'Mood Malam',
      'Emosi Dominan',
      'Catatan Mood',
      'Durasi Tidur (Jam)',
      'Kualitas Tidur',
      'Jumlah Gejala',
      'Jumlah Pikiran',
      'Peringatan Keselamatan',
    ];

    const rows = detailEntries.map((e) => [
      e.date,
      e.status,
      e.moodCheckIn?.moodMorning ?? '',
      e.moodCheckIn?.moodAfternoon ?? '',
      e.moodCheckIn?.moodEvening ?? '',
      `"${(e.moodCheckIn?.dominantEmotions || []).join(', ')}"`,
      `"${(e.moodCheckIn?.moodNote || '').replace(/"/g, '""')}"`,
      e.sleepHabits?.durationHours ?? '',
      e.sleepHabits?.sleepQuality ?? '',
      e.symptoms?.items?.length ?? 0,
      e.thoughts?.items?.length ?? 0,
      `"${(e.safetyFlagReasons || []).join('; ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jurnal-${selectedKonseliEmail}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Sub Navigation Bar for Counselor */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('triage')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
            activeTab === 'triage'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Dasbor Triase Konseli
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('detail')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
            activeTab === 'detail'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Riwayat Detail & Ekspor
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analysis')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'analysis'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Analisis Mingguan AI
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Ringkasan Mingguan Semua
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'settings'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Pengaturan
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Kelola Pengguna
          </button>
        )}
      </div>

      {/* TAB 1: DASBOR TRIASE KONSELI */}
      {activeTab === 'triage' && (
        <div className="space-y-4">
          {/* Controls: Search, Filters, Refresh */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama atau email konseli..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                  filterType === 'all'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Semua ({konseliList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('urgent')}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                  filterType === 'urgent'
                    ? 'bg-rose-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Perlu Perhatian
              </button>
              <button
                type="button"
                onClick={() => setFilterType('inactive')}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                  filterType === 'inactive'
                    ? 'bg-amber-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Belum Isi 3 Hari+
              </button>

              <button
                type="button"
                onClick={loadKonseliList}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors ml-auto sm:ml-2"
                title="Muat ulang"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Konseli Table / Cards */}
          <div className="space-y-2">
            {loading ? (
              <div className="bg-white rounded-2xl p-8 text-center text-xs text-stone-500">
                Memuat daftar konseli...
              </div>
            ) : filteredKonseli.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-xs text-stone-500">
                Tidak ada konseli yang cocok dengan filter.
              </div>
            ) : (
              filteredKonseli.map((k) => {
                const isUrgent = k.attentionLevel === 'segera';
                const isHigh = k.attentionLevel === 'tinggi';

                return (
                  <div
                    key={k.email}
                    className={`bg-white border rounded-2xl p-4 transition-all shadow-xs ${
                      isUrgent
                        ? 'border-rose-300 bg-rose-50/20'
                        : isHigh
                          ? 'border-amber-200'
                          : 'border-stone-200/80 hover:border-emerald-700/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-stone-900 text-sm">{k.name}</span>
                          <span className="text-xs text-stone-400">({k.email})</span>
                          {/* Attention Level label */}
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                              isUrgent
                                ? 'bg-rose-100 text-rose-800'
                                : isHigh
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            Prioritas: {k.attentionLevel.toUpperCase()}
                          </span>
                        </div>

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                          <span>
                            Terakhir Mengisi: {k.lastEntryDate ? k.lastEntryDate : 'Belum pernah'}
                          </span>
                          <span>·</span>
                          <span className="font-mono">
                            Mood 7 Hari: {k.averageMood7Days ? `${k.averageMood7Days}/10` : '-'}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            Tren:{' '}
                            {k.moodTrend === 'up' ? (
                              <span className="text-emerald-700 flex items-center font-medium">
                                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Naik
                              </span>
                            ) : k.moodTrend === 'down' ? (
                              <span className="text-rose-700 flex items-center font-medium">
                                <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> Turun
                              </span>
                            ) : (
                              <span className="text-stone-500 flex items-center">
                                <Minus className="w-3.5 h-3.5 mr-0.5" /> Stabil
                              </span>
                            )}
                          </span>
                          <span>·</span>
                          <span>{k.totalEntries} Entri</span>
                        </div>

                        {/* Alert Badges */}
                        {k.activeAlerts.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {k.activeAlerts.map((b, i) => (
                              <div
                                key={i}
                                className={`text-[11px] px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                                  b.severity === 'urgent'
                                    ? 'bg-rose-100/90 text-rose-950 font-semibold'
                                    : b.severity === 'warning'
                                      ? 'bg-amber-100 text-amber-950'
                                      : 'bg-stone-100 text-stone-700'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>{b.message}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedKonseliEmail(k.email);
                            setActiveTab('detail');
                          }}
                          className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition-colors"
                        >
                          Lihat Jurnal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedKonseliEmail(k.email);
                            setActiveTab('analysis');
                          }}
                          className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Analisis AI
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DETAIL KONSELI & EKSPOR */}
      {activeTab === 'detail' && (
        <div className="space-y-5">
          <div className="bg-white border border-stone-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="text-xs text-stone-400 block">Konseli Terpilih</span>
              <h3 className="text-base font-bold text-stone-900">{selectedKonseliEmail}</h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedKonseliEmail}
                onChange={(e) => loadKonseliDetail(e.target.value)}
                className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl"
              >
                {konseliList.map((k) => (
                  <option key={k.email} value={k.email}>
                    {k.name} ({k.email})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Ekspor CSV
              </button>
            </div>
          </div>

          {detailLoading ? (
            <div className="p-8 text-center text-xs text-stone-500">Memuat riwayat konseli...</div>
          ) : (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
                  <span className="text-[11px] text-stone-500 block">Total Entri</span>
                  <span className="text-xl font-bold text-stone-900 font-mono">{detailEntries.length}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
                  <span className="text-[11px] text-stone-500 block">Total Gejala Dicatat</span>
                  <span className="text-xl font-bold text-amber-900 font-mono">
                    {detailEntries.reduce((acc, e) => acc + (e.symptoms?.items?.length || 0), 0)}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
                  <span className="text-[11px] text-stone-500 block">Sesi Grounding</span>
                  <span className="text-xl font-bold text-emerald-900 font-mono">
                    {detailEntries.reduce((acc, e) => acc + (e.grounding?.logs?.length || 0), 0)}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
                  <span className="text-[11px] text-stone-500 block">Catatan Keselamatan</span>
                  <span className="text-xl font-bold text-rose-900 font-mono">
                    {detailEntries.reduce((acc, e) => acc + (e.safety?.items?.length || 0), 0)}
                  </span>
                </div>
              </div>

              {/* Entries List */}
              <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs">
                <h4 className="text-sm font-bold text-stone-900 mb-3">Daftar Seluruh Jurnal Konseli</h4>
                <div className="space-y-2">
                  {detailEntries.map((e) => (
                    <div
                      key={e.date}
                      className="p-3.5 border border-stone-100 hover:border-emerald-700/50 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-stone-900">{e.date}</span>
                          {e.safetyFlag && (
                            <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded">
                              PERHATIAN SEGERA
                            </span>
                          )}
                          <span className="text-stone-400">·</span>
                          <span className="text-stone-600">
                            Mood:{' '}
                            {(
                              ((e.moodCheckIn?.moodMorning ?? 5) +
                                (e.moodCheckIn?.moodAfternoon ?? 5) +
                                (e.moodCheckIn?.moodEvening ?? 5)) /
                              3
                            ).toFixed(1)}
                            /10
                          </span>
                        </div>
                        <p className="text-stone-600 line-clamp-1">{e.moodCheckIn?.moodNote || '-'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDetailEntry(e)}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-medium"
                      >
                        Buka Lengkap
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Modal Inspector Detail */}
          {selectedDetailEntry && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
              <div className="relative w-full max-w-xl max-h-[85vh] bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-xs text-stone-400">Inspeksi Lengkap Konselor</span>
                    <h3 className="text-base font-bold text-stone-900">{selectedDetailEntry.date}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDetailEntry(null)}
                    className="text-xs px-3 py-1.5 bg-stone-100 rounded-xl text-stone-600"
                  >
                    Tutup
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Suasana hati */}
                  <div className="bg-stone-50 p-3.5 rounded-2xl">
                    <span className="font-semibold block text-stone-900 mb-1">A. Suasana Hati</span>
                    <p className="text-stone-700">
                      Pagi: {selectedDetailEntry.moodCheckIn?.moodMorning} · Siang:{' '}
                      {selectedDetailEntry.moodCheckIn?.moodAfternoon} · Malam:{' '}
                      {selectedDetailEntry.moodCheckIn?.moodEvening}
                    </p>
                    <p className="text-stone-600 italic mt-1">
                      &ldquo;{selectedDetailEntry.moodCheckIn?.moodNote}&rdquo;
                    </p>
                  </div>

                  {/* Gejala */}
                  {selectedDetailEntry.symptoms?.items?.length > 0 && (
                    <div className="bg-stone-50 p-3.5 rounded-2xl">
                      <span className="font-semibold block text-stone-900 mb-1">D. Gejala</span>
                      {selectedDetailEntry.symptoms.items.map((s) => (
                        <div key={s.id} className="border-b border-stone-200/50 py-1 last:border-0">
                          <span className="font-medium">{s.symptom}</span> (Intensitas: {s.intensity}/10)
                          <p className="text-stone-500">Pemicu: {s.triggerSituation}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pikiran */}
                  {selectedDetailEntry.thoughts?.items?.length > 0 && (
                    <div className="bg-stone-50 p-3.5 rounded-2xl">
                      <span className="font-semibold block text-stone-900 mb-1">E. Catatan Pikiran</span>
                      {selectedDetailEntry.thoughts.items.map((t) => (
                        <div key={t.id} className="border-b border-stone-200/50 py-1 last:border-0">
                          <p className="font-medium text-stone-900">&ldquo;{t.automaticThoughts}&rdquo;</p>
                          <p className="text-emerald-900">Alternatif: {t.alternativePerspective}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Keselamatan */}
                  {selectedDetailEntry.safety?.items?.length > 0 && (
                    <div className="bg-rose-50 p-3.5 rounded-2xl text-rose-950">
                      <span className="font-bold block mb-1">G. Catatan Keselamatan</span>
                      {selectedDetailEntry.safety.items.map((safe) => (
                        <div key={safe.id} className="py-1">
                          <p className="font-semibold">Kekhawatiran: {safe.worryLevel}/10</p>
                          <p>{safe.whatHappened}</p>
                          <p className="text-[11px] text-rose-800">
                            Tindakan: {safe.actionTaken} · Kontak: {safe.contactedWhom}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ANALISIS MINGGUAN AI */}
      {activeTab === 'analysis' && (
        <div className="space-y-5">
          {/* Controls: Target Konseli & Week Selection */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-800" />
                  Agen Analisis Mingguan AI (Gemini)
                </h3>
                <p className="text-xs text-stone-500">
                  Menganalisis entri jurnal konseli dalam satu minggu kalender dan menyusun rekomendasi sesi konseling.
                </p>
              </div>

              <select
                value={selectedKonseliEmail}
                onChange={(e) => setSelectedKonseliEmail(e.target.value)}
                className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl"
              >
                {konseliList.map((k) => (
                  <option key={k.email} value={k.email}>
                    {k.name} ({k.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-stone-100">
              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">ID Minggu</label>
                <input
                  type="text"
                  placeholder="2026-W42"
                  value={targetWeekId}
                  onChange={(e) => setTargetWeekId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">Mulai (Senin)</label>
                <input
                  type="date"
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">Selesai (Minggu)</label>
                <input
                  type="date"
                  value={weekEndDate}
                  onChange={(e) => setWeekEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={generatingAnalysis}
                  onClick={handleGenerateAnalysis}
                  className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {generatingAnalysis ? 'Menganalisis...' : 'Buat Analisis'}
                </button>
              </div>
            </div>
          </div>

          {/* Hasil Analisis Terstruktur */}
          {currentAnalysis ? (
            <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs space-y-6">
              {/* Executive Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-semibold text-stone-500">
                      Periode {currentAnalysis.weekId}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-xs text-stone-500">
                      {currentAnalysis.startDate} s/d {currentAnalysis.endDate}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase ${
                        currentAnalysis.analysis.tingkat_perhatian === 'segera'
                          ? 'bg-rose-100 text-rose-800'
                          : currentAnalysis.analysis.tingkat_perhatian === 'tinggi'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Perhatian: {currentAnalysis.analysis.tingkat_perhatian}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-stone-900">
                    Laporan Hasil Analisis Pendukung Konselor
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">Status:</span>
                  <select
                    value={analysisStatus}
                    onChange={(e) => setAnalysisStatus(e.target.value as any)}
                    className="px-2.5 py-1 text-xs border border-stone-200 rounded-lg bg-stone-50"
                  >
                    <option value="draft">Draf</option>
                    <option value="approved">Disetujui</option>
                  </select>
                </div>
              </div>

              {/* Indikator Keselamatan (Paling Atas Jika Ada) */}
              {currentAnalysis.analysis.indikator_keselamatan?.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-950 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-900">
                    <ShieldAlert className="w-4 h-4 text-rose-700" />
                    <span>Perhatian Keselamatan & Tindak Lanjut Segera:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-900 leading-relaxed">
                    {currentAnalysis.analysis.indikator_keselamatan.map((ind, i) => (
                      <li key={i}>{ind}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ringkasan Eksekutif */}
              <div className="bg-stone-50/70 p-4 rounded-2xl text-xs space-y-1">
                <span className="font-bold text-stone-900 block">Ringkasan Eksekutif</span>
                <p className="text-stone-700 leading-relaxed">
                  {currentAnalysis.analysis.ringkasan_eksekutif}
                </p>
                <p className="text-[11px] text-stone-500 pt-1">
                  Alasan tingkat perhatian: {currentAnalysis.analysis.alasan_tingkat_perhatian}
                </p>
              </div>

              {/* Grid 2 Kolom: Pola Gejala & Pikiran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Pola Gejala */}
                <div className="bg-white border border-stone-200/80 p-4 rounded-2xl space-y-2">
                  <span className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-700" />
                    Pola Gejala Teramati
                  </span>
                  <div className="space-y-1 text-stone-600 text-[11px]">
                    <p>
                      <strong>Pemicu:</strong> {currentAnalysis.analysis.pola_gejala.pemicu}
                    </p>
                    <p>
                      <strong>Waktu & Situasi:</strong>{' '}
                      {currentAnalysis.analysis.pola_gejala.waktu_dan_situasi}
                    </p>
                    <p>
                      <strong>Yang Membantu:</strong>{' '}
                      {currentAnalysis.analysis.pola_gejala.strategi_membantu}
                    </p>
                    <p>
                      <strong>Durasi:</strong> {currentAnalysis.analysis.pola_gejala.durasi}
                    </p>
                  </div>
                </div>

                {/* Pola Pikiran */}
                <div className="bg-white border border-stone-200/80 p-4 rounded-2xl space-y-2">
                  <span className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-indigo-700" />
                    Pola Pikiran Otomatis
                  </span>
                  <div className="space-y-1 text-stone-600 text-[11px]">
                    <p>
                      <strong>Tema Utama:</strong>{' '}
                      {currentAnalysis.analysis.pola_pikiran.tema_pikiran_otomatis}
                    </p>
                    <p>
                      <strong>Pola Umum:</strong>{' '}
                      {currentAnalysis.analysis.pola_pikiran.pola_umum_yang_tampak}
                    </p>
                    <p>
                      <strong>Bukti Kutipan:</strong>{' '}
                      {currentAnalysis.analysis.pola_pikiran.bukti_yang_dikutip}
                    </p>
                  </div>
                </div>

                {/* Tidur & Kebiasaan */}
                <div className="bg-white border border-stone-200/80 p-4 rounded-2xl space-y-2">
                  <span className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Moon className="w-4 h-4 text-purple-700" />
                    Tidur & Kebiasaan Harian
                  </span>
                  <div className="space-y-1 text-stone-600 text-[11px]">
                    <p>
                      <strong>Pola Tidur:</strong>{' '}
                      {currentAnalysis.analysis.tidur_dan_kebiasaan.pola_tidur}
                    </p>
                    <p>
                      <strong>Kafein:</strong> {currentAnalysis.analysis.tidur_dan_kebiasaan.kafein}
                    </p>
                    <p>
                      <strong>Gerak Badan:</strong>{' '}
                      {currentAnalysis.analysis.tidur_dan_kebiasaan.gerak_badan}
                    </p>
                    <p>
                      <strong>Kaitan Gejala:</strong>{' '}
                      {currentAnalysis.analysis.tidur_dan_kebiasaan.kaitan_dengan_gejala}
                    </p>
                  </div>
                </div>

                {/* Efektivitas Latihan */}
                <div className="bg-white border border-stone-200/80 p-4 rounded-2xl space-y-2">
                  <span className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-teal-700" />
                    Efektivitas Grounding & Napas
                  </span>
                  <div className="space-y-1 text-stone-600 text-[11px]">
                    <p>
                      <strong>Frekuensi:</strong>{' '}
                      {currentAnalysis.analysis.efektivitas_latihan.frekuensi_grounding_dan_napas}
                    </p>
                    <p>
                      <strong>Penurunan Ketegangan:</strong>{' '}
                      {currentAnalysis.analysis.efektivitas_latihan.penurunan_ketegangan}
                    </p>
                    <p>
                      <strong>Kenyamanan:</strong>{' '}
                      {currentAnalysis.analysis.efektivitas_latihan.kenyamanan}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rekomendasi Sesi Konseling Berikutnya */}
              <div className="bg-emerald-50/60 border border-emerald-200/70 p-5 rounded-2xl text-xs space-y-3">
                <span className="font-bold text-emerald-950 block text-sm">
                  Rekomendasi Rencana Sesi Berikutnya
                </span>
                <p className="text-stone-700">
                  <strong>Fokus Utama:</strong>{' '}
                  {currentAnalysis.analysis.rekomendasi_sesi_berikutnya.fokus_utama}
                </p>

                {currentAnalysis.analysis.rekomendasi_sesi_berikutnya.pertanyaan_eksplorasi?.length > 0 && (
                  <div>
                    <strong className="block text-emerald-950 mb-1">Pertanyaan Eksplorasi untuk Sesi:</strong>
                    <ul className="list-disc list-inside space-y-1 text-stone-700 text-[11px]">
                      {currentAnalysis.analysis.rekomendasi_sesi_berikutnya.pertanyaan_eksplorasi.map(
                        (p, i) => (
                          <li key={i}>{p}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {currentAnalysis.analysis.rekomendasi_sesi_berikutnya.teknik_intervensi?.length > 0 && (
                  <div>
                    <strong className="block text-emerald-950 mb-1">Teknik / Intervensi yang Disarankan:</strong>
                    <ul className="list-disc list-inside space-y-1 text-stone-700 text-[11px]">
                      {currentAnalysis.analysis.rekomendasi_sesi_berikutnya.teknik_intervensi.map(
                        (t, i) => (
                          <li key={i}>{t}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Catatan Konselor & Opsi Bagikan ke Konseli */}
              <div className="bg-stone-50 border border-stone-200/80 p-5 rounded-2xl space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-stone-900 mb-1">
                    Catatan Refleksi Konselor (Dapat Diedit & Disimpan)
                  </label>
                  <textarea
                    rows={3}
                    value={counselorNotesInput}
                    onChange={(e) => setCounselorNotesInput(e.target.value)}
                    placeholder="Tuliskan catatan observasi klinis tambahan Anda untuk sesi..."
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-200/60">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sharedWithClient}
                      onChange={(e) => setSharedWithClient(e.target.checked)}
                      className="w-4 h-4 accent-emerald-800 rounded"
                    />
                    <span className="font-semibold text-stone-800">
                      Bagikan Ringkasan Ramah Bahasa ke Konseli
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSaveAnalysisUpdates}
                    className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-xl transition-colors shadow-xs"
                  >
                    Simpan Catatan & Pengaturan Analisis
                  </button>
                </div>

                {sharedWithClient && currentAnalysis.analysis.ringkasan_untuk_konseli && (
                  <div className="p-3 bg-white border border-emerald-200 rounded-xl text-[11px] text-stone-600">
                    <span className="font-semibold text-emerald-900 block mb-0.5">
                      Pratinjau Teks yang Akan Dilihat Konseli:
                    </span>
                    &ldquo;{currentAnalysis.analysis.ringkasan_untuk_konseli}&rdquo;
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-stone-200/80 text-center text-xs text-stone-500">
              Pilih konseli dan rentang tanggal di atas, lalu klik <strong>Buat Analisis</strong> untuk memulai.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RINGKASAN MINGGUAN SEMUA KONSELI */}
      {activeTab === 'overview' && (
        <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Ringkasan Mingguan Semua Konseli (Matriks Triase)
              </h3>
              <p className="text-xs text-stone-500">
                Gambaran cepat tingkat perhatian seluruh konseli untuk penentuan prioritas penanganan.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="p-3">Konseli</th>
                  <th className="p-3">Tingkat Perhatian</th>
                  <th className="p-3">Terakhir Jurnal</th>
                  <th className="p-3">Mood 7 Hari</th>
                  <th className="p-3">Poin Prioritas / Peringatan</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {konseliList.map((k) => (
                  <tr key={k.email} className="hover:bg-stone-50/50">
                    <td className="p-3 font-semibold text-stone-900">
                      <div>{k.name}</div>
                      <div className="text-[11px] text-stone-400 font-normal">{k.email}</div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold uppercase ${
                          k.attentionLevel === 'segera'
                            ? 'bg-rose-100 text-rose-800'
                            : k.attentionLevel === 'tinggi'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {k.attentionLevel}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{k.lastEntryDate || 'Belum ada'}</td>
                    <td className="p-3 font-mono">{k.averageMood7Days ? `${k.averageMood7Days}/10` : '-'}</td>
                    <td className="p-3 text-stone-600">
                      {k.activeAlerts.length > 0 ? (
                        <div className="space-y-0.5">
                          {k.activeAlerts.slice(0, 2).map((a, i) => (
                            <div key={i} className="text-[11px] text-rose-900">
                              • {a.message}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-emerald-700 text-[11px]">Kondisi terpantau aman</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedKonseliEmail(k.email);
                          setActiveTab('analysis');
                        }}
                        className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold"
                      >
                        Analisis
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PENGATURAN */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs space-y-5 max-w-xl">
          <div>
            <h3 className="text-base font-bold text-stone-900">Pengaturan Layanan & Kontak Darurat</h3>
            <p className="text-xs text-stone-500">
              Informasi ini akan ditampilkan langsung pada kartu bantuan darurat konseli saat terdeteksi risiko.
            </p>
          </div>

          {settingsSavedMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-3 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>{settingsSavedMsg}</span>
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-800 mb-1">
                Nomor Telepon Darurat Nasional (Hotline Sejiwa Kemenkes)
              </label>
              <input
                type="text"
                value={emergencyHotline}
                onChange={(e) => setEmergencyHotline(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-800 mb-1">
                Kontak Telepon Staf / Konselor Siaga Lembaga
              </label>
              <input
                type="text"
                value={counselorContact}
                onChange={(e) => setCounselorContact(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveEmergencySettings}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-xl transition-colors shadow-xs"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: KELOLA PENGGUNA (ADMIN ONLY) */}
      {activeTab === 'users' && isAdmin && (
        <div className="bg-white border border-stone-200/80 rounded-3xl p-6 shadow-xs space-y-5 max-w-xl">
          <div>
            <h3 className="text-base font-bold text-stone-900">Kelola Pengguna & Daftar Konselor</h3>
            <p className="text-xs text-stone-500">
              Email yang terdaftar di sini otomatis memperoleh peran <strong>Konselor</strong> saat login dengan akun Google.
            </p>
          </div>

          <form onSubmit={handleAddCounselor} className="flex gap-2">
            <input
              type="email"
              placeholder="Masukkan email Google konselor baru..."
              value={newCounselorInput}
              onChange={(e) => setNewCounselorInput(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Tambah
            </button>
          </form>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-stone-700 block">Daftar Konselor Terdaftar:</span>
            {counselorEmails.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between p-3 bg-stone-50 rounded-xl text-xs border border-stone-100"
              >
                <span className="font-mono text-stone-800">{email}</span>
                {email.toLowerCase() !== currentUserEmail.toLowerCase() ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveCounselor(email)}
                    className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
                    title="Hapus konselor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-[10px] text-emerald-800 font-semibold px-2 py-0.5 bg-emerald-50 rounded">
                    Anda (Admin)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
