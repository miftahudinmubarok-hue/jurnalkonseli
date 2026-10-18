import React from 'react';
import { UserProfile } from '../types/journal.js';
import { LogOut, ShieldCheck, HeartHandshake } from 'lucide-react';

interface HeaderProps {
  user: UserProfile | null;
  activeView: 'journal' | 'history' | 'counselor';
  onNavigate: (view: 'journal' | 'history' | 'counselor') => void;
  onLogout: () => void;
  storageMode: 'google_drive' | 'local_demo';
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeView,
  onNavigate,
  onLogout,
  storageMode,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate(user?.role === 'konselor' ? 'counselor' : 'journal')}
            className="text-base sm:text-lg font-bold tracking-tight text-stone-900 whitespace-nowrap hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <span className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center text-sm font-black">
              JK
            </span>
            <span>Jurnal Harian Konseli</span>
          </button>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Server Database Terhubung
          </span>
        </div>

        {/* Zone 2: 4-5 clean single-line nav links */}
        {user && (
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-stone-600">
            {user.role === 'konseli' && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('journal')}
                  className={`hover:text-emerald-900 transition-colors whitespace-nowrap py-1 ${
                    activeView === 'journal'
                      ? 'text-emerald-800 font-bold border-b-2 border-emerald-800'
                      : ''
                  }`}
                >
                  Isi Jurnal
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('history')}
                  className={`hover:text-emerald-900 transition-colors whitespace-nowrap py-1 ${
                    activeView === 'history'
                      ? 'text-emerald-800 font-bold border-b-2 border-emerald-800'
                      : ''
                  }`}
                >
                  Riwayat & Refleksi
                </button>
              </>
            )}

            {user.role === 'konselor' && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('counselor')}
                  className={`hover:text-emerald-900 transition-colors whitespace-nowrap py-1 ${
                    activeView === 'counselor'
                      ? 'text-emerald-800 font-bold border-b-2 border-emerald-800'
                      : ''
                  }`}
                >
                  Menu Konselor
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('journal')}
                  className={`hover:text-emerald-900 transition-colors whitespace-nowrap py-1 ${
                    activeView === 'journal'
                      ? 'text-emerald-800 font-bold border-b-2 border-emerald-800'
                      : ''
                  }`}
                >
                  Pratinjau Lembar Jurnal
                </button>
              </>
            )}
          </nav>
        )}

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-xs font-semibold text-stone-900 truncate max-w-[140px]">
                  {user.name}
                </span>
                <span className="text-[10px] text-stone-500 capitalize">
                  {user.role} {user.isAdmin && '(Admin)'}
                </span>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="p-2 sm:px-3 sm:py-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <span className="text-xs text-stone-500 font-medium">Lembaga Konseling</span>
          )}
        </div>
      </div>
    </header>
  );
};
