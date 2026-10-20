import React, { useState } from 'react';
import { Eye, Hand, Volume2, Sparkles, HeartHandshake, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { GroundingStepLog } from '../../types/journal';

interface GroundingExerciseProps {
  logs: GroundingStepLog[];
  onChange: (logs: GroundingStepLog[]) => void;
}

export const GroundingExercise: React.FC<GroundingExerciseProps> = ({ logs, onChange }) => {
  const [activeTab, setActiveTab] = useState<'interactive' | 'variations' | 'quick_log'>('interactive');
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Guided step values
  const [seeItems, setSeeItems] = useState<string[]>(['', '', '', '', '']);
  const [feelItems, setFeelItems] = useState<string[]>(['', '', '', '']);
  const [hearItems, setHearItems] = useState<string[]>(['', '', '']);
  const [smellItems, setSmellItems] = useState<string[]>(['', '']);
  const [tasteOrKindWords, setTasteOrKindWords] = useState<string>('');

  // Tension before & after
  const [tensionBefore, setTensionBefore] = useState<number>(6);
  const [tensionAfter, setTensionAfter] = useState<number>(3);
  const [noticed, setNoticed] = useState<string>('');
  const [variationUsed, setVariationUsed] = useState<string>('Teknik 5-4-3-2-1 Standar');

  const handleCompleteInteractive = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const summaryNoticed =
      noticed.trim() ||
      `Berhasil menyelesaikan latihan 5-4-3-2-1. Kata baik untuk diri: "${tasteOrKindWords || 'Saya aman di saat ini.'}"`;

    const newLog: GroundingStepLog = {
      id: `gr-${Date.now()}`,
      time: timeStr,
      tensionBefore,
      tensionAfter,
      noticed: summaryNoticed,
      variationUsed,
      guidedSteps: {
        see: seeItems.filter(Boolean),
        feel: feelItems.filter(Boolean),
        hear: hearItems.filter(Boolean),
        smell: smellItems.filter(Boolean),
        tasteOrKindWords,
      },
    };

    onChange([...logs, newLog]);
    // Reset inputs
    setSeeItems(['', '', '', '', '']);
    setFeelItems(['', '', '', '']);
    setHearItems(['', '', '']);
    setSmellItems(['', '']);
    setTasteOrKindWords('');
    setNoticed('');
    setCurrentStep(1);
    setActiveTab('quick_log');
  };

  const handleAddDirectLog = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newLog: GroundingStepLog = {
      id: `gr-${Date.now()}`,
      time: timeStr,
      tensionBefore,
      tensionAfter,
      noticed: noticed.trim() || 'Melakukan latihan grounding mandiri.',
      variationUsed,
    };

    onChange([...logs, newLog]);
    setNoticed('');
  };

  const handleRemoveLog = (id: string) => {
    onChange(logs.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100/80 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('interactive')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'interactive'
              ? 'bg-white text-emerald-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Pemandu 5-4-3-2-1
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('variations')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'variations'
              ? 'bg-white text-emerald-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Variasi Teknik Grounding
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('quick_log')}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'quick_log'
              ? 'bg-white text-emerald-900 shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Catatan ({logs.length})
        </button>
      </div>

      {/* 1. Mode Interaktif 5-4-3-2-1 */}
      {activeTab === 'interactive' && (
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h4 className="text-sm font-semibold text-stone-900">Langkah {currentStep} dari 5</h4>
              <p className="text-xs text-stone-500">
                Pusatkan perhatian pada lingkungan sekitar Anda saat ini.
              </p>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    currentStep === s
                      ? 'bg-emerald-800 text-white'
                      : currentStep > s
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: 5 Hal yang Dilihat */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                <Eye className="w-4 h-4" />
                <span>Sebutkan 5 hal yang dapat Anda LIHAT di sekitar Anda saat ini</span>
              </div>
              <p className="text-xs text-stone-500">
                Lihat detail kecil yang biasanya tidak diperhatikan (corak meja, bayangan daun, warna jam dinding).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {seeItems.map((val, idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`1.${idx + 1} Benda yang terlihat...`}
                    value={val}
                    onChange={(e) => {
                      const updated = [...seeItems];
                      updated[idx] = e.target.value;
                      setSeeItems(updated);
                    }}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 text-white text-xs font-medium rounded-xl hover:bg-emerald-900 transition-colors shadow-xs"
                >
                  Lanjut ke Langkah 2 <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: 4 Hal yang Disentuh */}
          {currentStep === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                <Hand className="w-4 h-4" />
                <span>Sebutkan 4 hal yang dapat Anda SENTUH / RASAKAN di tubuh Anda</span>
              </div>
              <p className="text-xs text-stone-500">
                Rasakan tekstur pakaian, telapak kaki menapak lantai, suhu ruangan, atau pegangan pena.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {feelItems.map((val, idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`2.${idx + 1} Tekstur atau sensasi sentuhan...`}
                    value={val}
                    onChange={(e) => {
                      const updated = [...feelItems];
                      updated[idx] = e.target.value;
                      setFeelItems(updated);
                    }}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-2 text-stone-500 text-xs hover:text-stone-800"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 text-white text-xs font-medium rounded-xl hover:bg-emerald-900 transition-colors shadow-xs"
                >
                  Lanjut ke Langkah 3 <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: 3 Suara */}
          {currentStep === 3 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                <Volume2 className="w-4 h-4" />
                <span>Sebutkan 3 suara yang dapat Anda DENGAR di sekeliling Anda</span>
              </div>
              <p className="text-xs text-stone-500">
                Dengarkan suara yang dekat atau jauh (desau angin, pendingin ruangan, bunyi kendaraan, atau desah napas).
              </p>
              <div className="space-y-2">
                {hearItems.map((val, idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`3.${idx + 1} Suara yang terdengar...`}
                    value={val}
                    onChange={(e) => {
                      const updated = [...hearItems];
                      updated[idx] = e.target.value;
                      setHearItems(updated);
                    }}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-2 text-stone-500 text-xs hover:text-stone-800"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 text-white text-xs font-medium rounded-xl hover:bg-emerald-900 transition-colors shadow-xs"
                >
                  Lanjut ke Langkah 4 <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: 2 Aroma */}
          {currentStep === 4 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Sebutkan 2 aroma yang dapat Anda CIUM di ruangan / sekitar</span>
              </div>
              <p className="text-xs text-stone-500">
                Wangi sabun di tangan, wangi minuman hangat, udara bersih, atau aroma pakaian Anda.
              </p>
              <div className="space-y-2">
                {smellItems.map((val, idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`4.${idx + 1} Aroma yang tercium...`}
                    value={val}
                    onChange={(e) => {
                      const updated = [...smellItems];
                      updated[idx] = e.target.value;
                      setSmellItems(updated);
                    }}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-3 py-2 text-stone-500 text-xs hover:text-stone-800"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 text-white text-xs font-medium rounded-xl hover:bg-emerald-900 transition-colors shadow-xs"
                >
                  Langkah Terakhir <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: 1 Rasa / Kata Baik */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                <HeartHandshake className="w-4 h-4" />
                <span>1 Hal yang dikecap ATAU satu kata baik / afirmasi hangat untuk diri sendiri</span>
              </div>
              <p className="text-xs text-stone-500">
                Rasa teh hangat di lidah, rasa air mineral, atau satu kalimat lembut: &ldquo;Saya aman saat ini, tubuh saya boleh beristirahat.&rdquo;
              </p>
              <input
                type="text"
                placeholder="Contoh: 'Saya sedang berproses dan saya cukup apa adanya.'"
                value={tasteOrKindWords}
                onChange={(e) => setTasteOrKindWords(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />

              {/* Evaluasi Ketegangan Sebelum & Sesudah */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-3">
                <span className="text-xs font-semibold text-emerald-950 block">
                  Evaluasi Ketegangan Tubuh
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between text-xs text-stone-600 mb-1">
                      <span>Ketegangan SEBELUM (0-10):</span>
                      <span className="font-semibold text-stone-900 font-mono">{tensionBefore}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={tensionBefore}
                      onChange={(e) => setTensionBefore(Number(e.target.value))}
                      className="w-full accent-emerald-800"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>0: Sangat rileks</span>
                      <span>10: Sangat tegang</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-stone-600 mb-1">
                      <span>Ketegangan SESUDAH (0-10):</span>
                      <span className="font-semibold text-emerald-800 font-mono">{tensionAfter}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={tensionAfter}
                      onChange={(e) => setTensionAfter(Number(e.target.value))}
                      className="w-full accent-emerald-800"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>0: Sangat rileks</span>
                      <span>10: Sangat tegang</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Apa yang Anda perhatikan setelah latihan ini?
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Otot bahu lebih kendur, pikiran terasa lebih hadir di sini."
                    value={noticed}
                    onChange={(e) => setNoticed(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-3 py-2 text-stone-500 text-xs hover:text-stone-800"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleCompleteInteractive}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-800 text-white text-xs font-semibold rounded-xl hover:bg-emerald-900 transition-colors shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Selesai & Simpan Sesi Grounding
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Variasi Teknik Grounding */}
      {activeTab === 'variations' && (
        <div className="bg-stone-50/70 border border-stone-200/80 rounded-2xl p-5 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-stone-900">Variasi Teknik Grounding Alternatif</h4>
            <p className="text-xs text-stone-500">
              Jika berada di tempat ramai atau situasi yang membutuhkan cara cepat dan tidak mencolok:
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                title: 'Menekan Telapak Kaki ke Lantai',
                desc: 'Duduk tegak, letakkan kedua telapak kaki rata di lantai tanpa alas kaki jika memungkinkan. Rasakan gravitasi menarik tubuh Anda ke bumi, tekan tumit dan jari kaki bergantian secara perlahan.',
                variation: 'Menekan telapak kaki ke lantai',
              },
              {
                title: 'Menggenggam Benda Bertekstur',
                desc: 'Pegang benda nyata di saku atau tas Anda (cincin, batu halus, kunci, atau serat kain baju). Perhatikan detail suhunya yang dingin atau hangat, kekerasan, atau kehalusan tepiannya.',
                variation: 'Menggenggam benda bertekstur nyata',
              },
              {
                title: 'Menyebut Benda Berwarna Tertentu',
                desc: 'Pilih satu warna (misalnya hijau atau biru). Telusuri seluruh ruangan dan sebutkan di dalam hati 5 benda yang memiliki warna tersebut secara bergantian.',
                variation: 'Menyebut 5 benda berwarna tertentu',
              },
              {
                title: 'Menelusuri Garis Jemari (Tracing Hands)',
                desc: 'Buka satu telapak tangan Anda. Dengan telunjuk tangan satunya, telusuri perlahan tepi jemari Anda ke atas dan ke bawah seiring tarikan dan hembusan napas alami.',
                variation: 'Menelusuri tepi jemari (tracing)',
              },
            ].map((v, i) => (
              <div
                key={i}
                className="bg-white border border-stone-200/80 rounded-xl p-3.5 text-xs hover:border-emerald-700/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-stone-900">{v.title}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setVariationUsed(v.variation);
                      setActiveTab('quick_log');
                    }}
                    className="text-emerald-800 hover:text-emerald-950 font-medium text-[11px]"
                  >
                    Pakai Teknik Ini →
                  </button>
                </div>
                <p className="text-stone-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Catatan Grounding Hari Ini & Form Cepat */}
      {activeTab === 'quick_log' && (
        <div className="space-y-4">
          <form onSubmit={handleAddDirectLog} className="bg-stone-50/70 border border-stone-200/80 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-stone-900">Catat Sesi Grounding Cepat</h4>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Variasi yang Digunakan</label>
              <input
                type="text"
                value={variationUsed}
                onChange={(e) => setVariationUsed(e.target.value)}
                placeholder="Contoh: Menekan telapak kaki ke lantai"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs text-stone-600 mb-1">
                  <span>Ketegangan SEBELUM:</span>
                  <span className="font-semibold font-mono text-stone-900">{tensionBefore}/10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={tensionBefore}
                  onChange={(e) => setTensionBefore(Number(e.target.value))}
                  className="w-full accent-emerald-800"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-stone-600 mb-1">
                  <span>Ketegangan SESUDAH:</span>
                  <span className="font-semibold font-mono text-emerald-800">{tensionAfter}/10</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={tensionAfter}
                  onChange={(e) => setTensionAfter(Number(e.target.value))}
                  className="w-full accent-emerald-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Apa yang Saya Perhatikan?</label>
              <input
                type="text"
                placeholder="Contoh: Kaki terasa berpijak mantap, debar jantung melambat"
                value={noticed}
                onChange={(e) => setNoticed(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
              >
                + Simpan Sesi Grounding
              </button>
            </div>
          </form>

          {/* List of existing logs */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-stone-500">
                Sesi Grounding Hari Ini ({logs.length})
              </span>
              {logs.map((log) => {
                const diff = (log.tensionBefore ?? 0) - (log.tensionAfter ?? 0);
                return (
                  <div
                    key={log.id}
                    className="bg-white border border-stone-200/80 rounded-xl p-3 flex items-start justify-between text-xs shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-stone-500 text-[11px] mb-1">
                        <span className="font-semibold text-stone-800">{log.time}</span>
                        <span>·</span>
                        <span>{log.variationUsed || '5-4-3-2-1'}</span>
                        <span>·</span>
                        <span className="font-mono">
                          Ketegangan: {log.tensionBefore} → {log.tensionAfter}{' '}
                          {diff > 0 && <span className="text-emerald-700">(-{diff})</span>}
                        </span>
                      </div>
                      <p className="text-stone-800">{log.noticed}</p>
                      {log.guidedSteps?.tasteOrKindWords && (
                        <p className="text-emerald-800 text-[11px] mt-1 italic">
                          &ldquo;{log.guidedSteps.tasteOrKindWords}&rdquo;
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLog(log.id)}
                      className="text-stone-400 hover:text-rose-600 text-xs px-2 py-1 ml-2"
                    >
                      Hapus
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
