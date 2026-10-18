/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { BottomNav } from './components/BottomNav.js';
import { LoginView } from './components/auth/LoginView.js';
import { InformedConsentModal } from './components/InformedConsentModal.js';
import { SafetyAlertModal } from './components/SafetyAlertModal.js';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal.js';
import { JournalForm } from './components/journal/JournalForm.js';
import { KonseliHistory } from './components/history/KonseliHistory.js';
import { CounselorDashboard } from './components/counselor/CounselorDashboard.js';
import { api, getStoredToken, setStoredToken } from './services/api.js';
import { DailyJournalEntry, UserProfile, CounselorConfig } from './types/journal.js';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'journal' | 'history' | 'counselor'>('journal');

  // App system status
  const [storageMode, setStorageMode] = useState<'google_drive' | 'local_demo'>('local_demo');
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [emergencySettings, setEmergencySettings] = useState<CounselorConfig['emergencySettings']>();
  const [driveErrorMessage, setDriveErrorMessage] = useState<string | null>(null);
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null);
  const [dismissDriveWarning, setDismissDriveWarning] = useState<boolean>(false);

  // Modals
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState<boolean>(false);
  const [safetyReasons, setSafetyReasons] = useState<string[]>([]);

  // Journal form data
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentEntry, setCurrentEntry] = useState<DailyJournalEntry | null>(null);
  const [myEntries, setMyEntries] = useState<DailyJournalEntry[]>([]);
  const [sharedAnalyses, setSharedAnalyses] = useState<any[]>([]);

  // Check auth and initial status on load with automatic retry for server warmup
  useEffect(() => {
    let mounted = true;

    const initApp = async (retryCount = 0) => {
      try {
        const status = await api.getStatus();
        if (!mounted) return;
        setStorageMode(status.storageMode);
        setGoogleClientId(status.googleClientId);
        setEmergencySettings(status.emergencySettings);
        if (status.driveErrorMessage) {
          setDriveErrorMessage(status.driveErrorMessage);
        }
        if (status.serviceAccountEmail) {
          setServiceAccountEmail(status.serviceAccountEmail);
        }

        const token = getStoredToken();
        if (token) {
          try {
            const meRes = await api.getCurrentUser();
            if (!mounted) return;
            setUser(meRes.user);
            if (!meRes.user.consentGivenAt) {
              setShowConsentModal(true);
            }
            if (meRes.user.role === 'konselor') {
              setActiveView('counselor');
            } else {
              setActiveView('journal');
            }
          } catch {
            setStoredToken(null);
            if (mounted) setUser(null);
          }
        }
      } catch (err: any) {
        if (retryCount < 3 && mounted) {
          setTimeout(() => initApp(retryCount + 1), 1200);
          return;
        }
        console.error('Failed to init app:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initApp();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch entries for active user
  const fetchMyData = async () => {
    if (!user) return;
    try {
      const [entryRes, listRes, sharedRes] = await Promise.all([
        api.getEntryByDate(selectedDate),
        api.listEntries(),
        user.role === 'konseli' ? api.getSharedAnalysis() : Promise.resolve({ sharedAnalyses: [] }),
      ]);
      setCurrentEntry(entryRes.entry);
      setMyEntries(listRes.entries);
      setSharedAnalyses(sharedRes.sharedAnalyses);
    } catch (err) {
      console.error('Error fetching entries:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyData();
    }
  }, [user, selectedDate]);

  // Auth Handlers
  const handleManualLogin = async (email: string, password: string) => {
    const res = await api.loginManual({ email, password });
    setStoredToken(res.token);
    setUser(res.user);
    if (!res.user.consentGivenAt) {
      setShowConsentModal(true);
    }
    setActiveView(res.user.role === 'konselor' ? 'counselor' : 'journal');
  };

  const handleManualRegister = async (
    name: string,
    email: string,
    password: string,
    role: 'konseli' | 'konselor'
  ) => {
    const res = await api.registerManual({ name, email, password, role });
    setStoredToken(res.token);
    setUser(res.user);
    if (!res.user.consentGivenAt) {
      setShowConsentModal(true);
    }
    setActiveView(res.user.role === 'konselor' ? 'counselor' : 'journal');
  };


  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    setActiveView('journal');
  };

  // Informed consent submission
  const handleAcceptConsent = async () => {
    const res = await api.submitConsent();
    if (user) {
      setUser({ ...user, consentGivenAt: res.consentGivenAt });
    }
    setShowConsentModal(false);
  };

  // Save entry
  const handleSaveEntry = async (date: string, entryData: Partial<DailyJournalEntry>, isSubmit: boolean) => {
    const res = await api.saveEntry(date, entryData);
    setCurrentEntry(res.entry);
    fetchMyData();

    if (res.safetyAlertTriggered) {
      setSafetyReasons(res.safetyAlertReasons);
      setSafetyModalOpen(true);
    }
  };

  const handleExportMyData = async () => {
    try {
      await api.exportMyData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold mx-auto animate-pulse">
            JK
          </div>
          <p className="text-xs text-stone-500 font-medium">Memuat Jurnal Harian Konseli...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col text-stone-800 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-950">
      {/* Top Header Contract */}
      <Header
        user={user}
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={handleLogout}
        storageMode={storageMode}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6">
        {!user ? (
          <LoginView
            storageMode={storageMode}
            onLoginManual={handleManualLogin}
            onRegisterManual={handleManualRegister}
          />
        ) : (
          <>
            {user.role === 'konseli' ? (
              activeView === 'journal' ? (
                <JournalForm
                  initialDate={selectedDate}
                  initialEntry={currentEntry}
                  onSave={handleSaveEntry}
                  onDateChange={(d) => setSelectedDate(d)}
                  onSafetyTriggered={(reasons) => {
                    setSafetyReasons(reasons);
                    setSafetyModalOpen(true);
                  }}
                />
              ) : (
                <KonseliHistory
                  entries={myEntries}
                  sharedAnalyses={sharedAnalyses}
                  onSelectDate={(d) => {
                    setSelectedDate(d);
                    setActiveView('journal');
                  }}
                />
              )
            ) : (
              // Peran Konselor
              activeView === 'counselor' ? (
                <CounselorDashboard
                  isAdmin={user.isAdmin}
                  currentUserEmail={user.email}
                />
              ) : (
                // Konselor can preview the journal form
                <JournalForm
                  initialDate={selectedDate}
                  initialEntry={currentEntry}
                  onSave={handleSaveEntry}
                  onDateChange={(d) => setSelectedDate(d)}
                  onSafetyTriggered={(reasons) => {
                    setSafetyReasons(reasons);
                    setSafetyModalOpen(true);
                  }}
                />
              )
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200/80 bg-white/70 py-6 px-4 text-center text-xs text-stone-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-stone-400">
            Aplikasi ini bukan layanan darurat dan tidak menggantikan konselor atau tenaga kesehatan.
          </p>

          <div className="flex items-center gap-4 text-[11px] font-medium text-stone-600">
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="hover:text-emerald-900 transition-colors underline underline-offset-2"
            >
              Kebijakan Privasi & Persetujuan
            </button>

            {user && (
              <button
                type="button"
                onClick={handleExportMyData}
                className="hover:text-emerald-900 transition-colors underline underline-offset-2"
              >
                Unduh Data Saya
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        user={user}
        activeView={activeView}
        onNavigate={setActiveView}
        onOpenPrivacy={() => setShowPrivacyModal(true)}
      />

      {/* Modals */}
      <InformedConsentModal
        isOpen={showConsentModal}
        onAccept={handleAcceptConsent}
      />

      <SafetyAlertModal
        isOpen={safetyModalOpen}
        onClose={() => setSafetyModalOpen(false)}
        reasons={safetyReasons}
        emergencySettings={emergencySettings}
      />

      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onExportData={user ? handleExportMyData : undefined}
        consentDate={user?.consentGivenAt}
      />
    </div>
  );
}
