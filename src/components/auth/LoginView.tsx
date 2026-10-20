import React, { useState } from 'react';
import {
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  Stethoscope,
} from 'lucide-react';

interface LoginViewProps {
  storageMode?: string;
  onLoginManual: (email: string, password: string) => Promise<void>;
  onRegisterManual: (
    name: string,
    email: string,
    password: string,
    role: 'konseli' | 'konselor'
  ) => Promise<void>;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginManual,
  onRegisterManual,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

  // Register form state
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regRole, setRegRole] = useState<'konseli' | 'konselor'>('konseli');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginEmail.includes('@')) {
      setErrorMsg('Silakan masukkan alamat email yang valid.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Silakan masukkan kata sandi Anda.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await onLoginManual(loginEmail.trim(), loginPassword);
    } catch (err: any) {
      let msg = err?.message || 'Gagal masuk akun. Periksa kembali email dan kata sandi Anda.';
      if (msg.includes('NOT_FOUND') || msg.includes('sin1::')) {
        msg = 'Koneksi ke server sedang disinkronkan. Silakan coba klik sekali lagi.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || regName.trim().length < 2) {
      setErrorMsg('Nama lengkap minimal 2 karakter.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('Alamat email tidak valid.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await onRegisterManual(regName.trim(), regEmail.trim(), regPassword, regRole);
    } catch (err: any) {
      let msg = err?.message || 'Gagal mendaftar akun.';
      if (msg.includes('NOT_FOUND') || msg.includes('sin1::')) {
        msg = 'Koneksi sedang disinkronkan. Silakan klik "Daftar & Masuk Sekarang" sekali lagi.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-emerald-800 text-white shadow-md text-xl font-black mb-1">
            JK
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Jurnal Harian Konseli
          </h1>
          <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
            Ruang refleksi aman, hangat, dan rahasia. Pengisian jurnal tersimpan otomatis dan dapat dipantau langsung oleh konselor.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Buat Akun Baru
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-3.5 text-xs text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-3.5 text-xs text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-7 shadow-xs">
          {activeTab === 'login' ? (
            /* TAB MASUK / LOGIN */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all text-stone-900 placeholder:text-stone-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Masukkan kata sandi Anda"
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all text-stone-900 placeholder:text-stone-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Memproses...</span>
                ) : (
                  <>
                    <span>Masuk ke Jurnal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* TAB DAFTAR AKUN BARU */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Contoh: Rina Wijaya"
                    className="w-full pl-10 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all text-stone-900 placeholder:text-stone-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="rina@gmail.com"
                    className="w-full pl-10 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all text-stone-900 placeholder:text-stone-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Peran Akun
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('konseli')}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                      regRole === 'konseli'
                        ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950 font-bold'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-800" />
                      <span className="text-xs">Konseli</span>
                    </div>
                    <span className="text-[10px] text-stone-500 font-normal">
                      Mengisi jurnal harian pribadi
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('konselor')}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                      regRole === 'konselor'
                        ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950 font-bold'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-emerald-800" />
                      <span className="text-xs">Konselor</span>
                    </div>
                    <span className="text-[10px] text-stone-500 font-normal">
                      Memantau konseli & analisis AI
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 karakter"
                      className="w-full pl-10 pr-8 py-2 text-xs bg-stone-50 border border-stone-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all text-stone-900 placeholder:text-stone-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
                    >
                      {showRegPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Konfirmasi Sandi
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Ulangi sandi"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all text-stone-900 placeholder:text-stone-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Membuat Akun...</span>
                ) : (
                  <>
                    <span>Daftar & Masuk Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Privasi & Keamanan */}
          <div className="pt-4 mt-4 border-t border-stone-100">
            <div className="flex items-center gap-2 text-stone-600 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Data pengisian jurnal tersimpan aman dan terenkripsi pada server.</span>
            </div>
          </div>
        </div>

        {/* Disclaimer footer */}
        <p className="text-center text-[11px] text-stone-400 leading-relaxed max-w-sm mx-auto">
          Aplikasi ini mendigitalkan jurnal harian konseli. Bukan layanan darurat medis dan tidak menggantikan penanganan darurat rumah sakit.
        </p>
      </div>
    </div>
  );
};
