import React from 'react';
import { Phone, ShieldAlert, Heart, X, MapPin } from 'lucide-react';
import { CounselorConfig } from '../types/journal';

interface SafetyAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  reasons: string[];
  emergencySettings?: CounselorConfig['emergencySettings'];
}

export const SafetyAlertModal: React.FC<SafetyAlertModalProps> = ({
  isOpen,
  onClose,
  reasons,
  emergencySettings,
}) => {
  if (!isOpen) return null;

  const hotline = emergencySettings?.emergencyNumber || '119';
  const hotlineExt = emergencySettings?.hotlineExtension || '8';
  const counselorContact = emergencySettings?.counselorContact || '0812-3456-7890 (Pusat Konseling Jiwa Tenang)';
  const hospitalNote =
    emergencySettings?.nearestHospitalNote || 'Instalasi Gawat Darurat (IGD) Rumah Sakit terdekat';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-rose-200/60 overflow-hidden">
        {/* Soft supportive header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-700">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900">
                Kami Peduli pada Keselamatan Anda
              </h3>
              <p className="text-xs text-stone-500">
                Anda tidak harus memikul perasaan berat ini seorang diri.
              </p>
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

        {/* Why this popped up */}
        {reasons.length > 0 && (
          <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-3 mb-5 text-xs text-rose-900">
            <span className="font-semibold block mb-0.5">Catatan Perhatian:</span>
            {reasons.map((r, i) => (
              <div key={i}>• {r}</div>
            ))}
          </div>
        )}

        <p className="text-xs text-stone-700 leading-relaxed mb-5">
          Sistem kami mendeteksi bahwa saat ini Anda mungkin sedang menghadapi tekanan atau kekhawatiran yang sangat mendalam. Jurnal ini telah ditandai sebagai <strong>Perhatian Segera</strong> untuk konselor Anda, namun bantuan langsung tersedia kapan saja:
        </p>

        {/* Action contact cards */}
        <div className="space-y-3 mb-6">
          {/* Hotline 119 ext 8 */}
          <a
            href={`tel:${hotline}`}
            className="flex items-center justify-between p-4 bg-emerald-800 text-white rounded-2xl hover:bg-emerald-900 transition-colors shadow-xs"
          >
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5" />
              <div>
                <span className="text-xs font-semibold block">
                  Layanan Sejiwa (Kemenkes RI)
                </span>
                <span className="text-[11px] text-emerald-100">
                  Telepon Darurat {hotline} (Tekan Ekstensi {hotlineExt})
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold underline underline-offset-2">Panggil</span>
          </a>

          {/* Counselor Direct Contact */}
          <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-2xl text-xs text-stone-800">
            <div className="flex items-center gap-2 font-semibold text-stone-900 mb-0.5">
              <Phone className="w-4 h-4 text-emerald-800" />
              <span>Kontak Lembaga Konseling</span>
            </div>
            <p className="text-stone-600 mb-1">
              Segera hubungi konselor atau staf jaga kami:
            </p>
            <span className="font-mono font-medium text-emerald-900">{counselorContact}</span>
          </div>

          {/* Hospital emergency */}
          <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-2xl text-xs text-stone-800">
            <div className="flex items-center gap-2 font-semibold text-stone-900 mb-0.5">
              <MapPin className="w-4 h-4 text-emerald-800" />
              <span>Instalasi Gawat Darurat (IGD)</span>
            </div>
            <p className="text-stone-600">{hospitalNote}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-100 pt-3">
          <span>Kontak darurat dikelola oleh administrator lembaga.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium rounded-xl transition-colors"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
