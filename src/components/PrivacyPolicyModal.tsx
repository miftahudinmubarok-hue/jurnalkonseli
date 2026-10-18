import React from 'react';
import { X, Shield, Lock, Download, FileText, Database } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportData?: () => void;
  consentDate?: string | null;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onExportData,
  consentDate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl max-h-[90vh] bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 overflow-y-auto">
        <div className="flex items-start justify-between border-b border-stone-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Kebijakan Privasi & Ketentuan Persetujuan
              </h3>
              <p className="text-xs text-stone-500">Jurnal Harian Konseling Lembaga</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {consentDate && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-xs text-emerald-950 mb-5 flex items-center justify-between">
            <span>Persetujuan Anda telah tercatat pada:</span>
            <span className="font-semibold font-mono">
              {new Date(consentDate).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        <div className="space-y-4 text-xs text-stone-700 leading-relaxed mb-6">
          <div>
            <h4 className="font-semibold text-stone-900 mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-800" />
              1. Kerahasiaan Sesi & Akses Konselor
            </h4>
            <p>
              Data yang Anda masukkan (suasana hati, latihan grounding, latihan pernapasan, catatan gejala, catatan pikiran, tidur, dan keselamatan) dikelola dengan prinsip kerahasiaan konseling. Akses data dibatasi hanya untuk konselor terdaftar dan terikat kode etik profesi.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-stone-900 mb-1 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-800" />
              2. Penyimpanan di Google Drive Lembaga
            </h4>
            <p>
              Semua berkas jurnal disimpan di folder terisolasi Google Drive resmi lembaga konseling menggunakan akun layanan (Service Account) yang aman. Frontend tidak pernah memuat kunci kredensial.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-stone-900 mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-800" />
              3. Pemanfaatan Agen AI Gemini
            </h4>
            <p>
              Model AI Gemini digunakan secara eksklusif dari backend untuk membantu konselor menganalisis pola mingguan dan menyusun bahan eksplorasi sesi. AI tidak pernah menetapkan diagnosis klinis atau meresepkan tindakan medis. Keputusan akhir sepenuhnya di tangan konselor manusia Anda.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-stone-900 mb-1 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-800" />
              4. Hak Kendali & Unduh Data
            </h4>
            <p>
              Anda berhak memperoleh salinan lengkap data jurnal pribadi Anda kapan saja dalam format digital (JSON).
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-stone-100">
          {onExportData && (
            <button
              type="button"
              onClick={onExportData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Seluruh Data Saya
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl transition-colors ml-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
