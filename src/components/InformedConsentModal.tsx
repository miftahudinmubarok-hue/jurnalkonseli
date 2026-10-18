import React, { useState } from 'react';
import { ShieldCheck, Lock, FolderHeart, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface InformedConsentModalProps {
  isOpen: boolean;
  onAccept: () => Promise<void>;
}

export const InformedConsentModal: React.FC<InformedConsentModalProps> = ({
  isOpen,
  onAccept,
}) => {
  const [agreed, setAgreed] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!agreed) return;
    setSubmitting(true);
    try {
      await onAccept();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <h2 className="text-lg font-bold text-stone-900 mb-1">
          Lembar Persetujuan Layanan (Informed Consent)
        </h2>
        <p className="text-xs text-stone-500 mb-5">
          Selamat datang di Jurnal Harian Konseli. Sebelum memulai, mohon pahami ketentuan penggunaan dan privasi berikut:
        </p>

        <div className="space-y-3.5 mb-6 text-xs text-stone-700">
          <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100">
            <Lock className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-stone-900 block">Kerahasiaan Data Jurnal</span>
              Seluruh catatan, emosi, pikiran, dan riwayat yang Anda tuliskan bersifat rahasia dan hanya dapat diakses oleh konselor profesional lembaga yang mendampingi Anda.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100">
            <FolderHeart className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-stone-900 block">Penyimpanan Terpusat Lembaga</span>
              Data tersimpan aman di repositori Google Drive resmi milik lembaga konseling guna menjamin kesinambungan catatan sesi konseling Anda.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-200/60 text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-950 block">Bukan Layanan Darurat Krisis 24 Jam</span>
              Jurnal ini adalah alat refleksi harian dan pendukung sesi konseling terjadwal, bukan layanan penanganan gawat darurat langsung. Jika berada dalam krisis, segera hubungi 119 atau IGD terdekat.
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-2xl cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-emerald-800 rounded"
          />
          <span className="text-xs text-emerald-950 font-medium leading-relaxed">
            Saya telah membaca, memahami, dan menyetujui ketentuan kerahasiaan data serta batasan layanan di atas.
          </span>
        </label>

        <button
          type="button"
          disabled={!agreed || submitting}
          onClick={handleSubmit}
          className={`w-full py-3 px-5 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
            agreed && !submitting
              ? 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-md active:scale-[0.99]'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          {submitting ? 'Menyimpan Persetujuan...' : 'Saya Setuju & Mulai Mengisi Jurnal'}
        </button>
      </div>
    </div>
  );
};
