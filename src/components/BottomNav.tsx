import React from 'react';
import { PenTool, Calendar, Users, HeartHandshake, Shield } from 'lucide-react';
import { UserProfile } from '../types/journal.js';

interface BottomNavProps {
  user: UserProfile | null;
  activeView: 'journal' | 'history' | 'counselor';
  onNavigate: (view: 'journal' | 'history' | 'counselor') => void;
  onOpenPrivacy: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  user,
  activeView,
  onNavigate,
  onOpenPrivacy,
}) => {
  if (!user) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 pb-safe">
      <div className="grid grid-cols-3 items-center h-14 max-w-md mx-auto">
        {user.role === 'konseli' ? (
          <>
            <button
              type="button"
              onClick={() => onNavigate('journal')}
              className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
                activeView === 'journal' ? 'text-emerald-800' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span className="text-[10px] font-semibold mt-1">Isi Jurnal</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('history')}
              className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
                activeView === 'history' ? 'text-emerald-800' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-[10px] font-semibold mt-1">Riwayat</span>
            </button>

            <button
              type="button"
              onClick={onOpenPrivacy}
              className="min-h-[44px] flex flex-col items-center justify-center text-stone-500 hover:text-stone-800 transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span className="text-[10px] font-semibold mt-1">Privasi</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onNavigate('counselor')}
              className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
                activeView === 'counselor' ? 'text-emerald-800' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-semibold mt-1">Konselor</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('journal')}
              className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
                activeView === 'journal' ? 'text-emerald-800' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span className="text-[10px] font-semibold mt-1">Lembar Jurnal</span>
            </button>

            <button
              type="button"
              onClick={onOpenPrivacy}
              className="min-h-[44px] flex flex-col items-center justify-center text-stone-500 hover:text-stone-800 transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span className="text-[10px] font-semibold mt-1">Privasi</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
