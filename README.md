# Jurnal Harian Konseli

Aplikasi web full-stack (React + Node/Express + Google Drive API v3 + Gemini AI) untuk digitalisasi lembar jurnal konseling harian konseli, pemantauan konselor, dan analisis mingguan agen AI sebagai alat bantu keputusan konselor.

---

## Ringkasan Fitur

1. **Peran & Otentikasi**
   - Google Sign-In dengan verifikasi token di backend.
   - Peran otomatis: Konseli (pengguna umum) dan Konselor (dikelola oleh Admin di `/_config/users.json`).
   - Lembar informed consent di awal login untuk konseli.
2. **Penyimpanan Terpusat Google Drive Lembaga**
   - Menggunakan Google Drive API v3 dengan Service Account (folder dibagikan ke email service account sebagai Editor).
   - Struktur folder: `/_config/users.json`, `/konseli/<email>/entries/YYYY-MM-DD.json`, `/konseli/<email>/analisis/YYYY-Www.json`.
   - Fallback otomatis ke penyimpanan lokal terstruktur (`.data/`) berlabel **MODE DEMO** jika kredensial belum diisi.
3. **Formulir Jurnal Harian (Bagian A - G)**
   - A. Check-in Suasana Hati Harian (slider 0-10, chip emosi, catatan).
   - B. Latihan Grounding 5-4-3-2-1 (mode interaktif langkah demi langkah, variasi taktil/warna, evaluasi ketegangan sebelum & sesudah).
   - C. Latihan Napas Lembut (pewaktu animasi 4-6, durasi 2-5 menit, peringatan keselamatan).
   - D. Catatan Gejala (multibaris, jam, intensitas 0-10, pemicu, apa yang membantu, durasi, pola).
   - E. Catatan Pikiran (situasi, pikiran otomatis, emosi, sudut pandang alternatif, pertanyaan bantu restrukturisasi kognitif).
   - F. Catatan Tidur & Kebiasaan Harian (hitung otomatis durasi tidur, kualitas, kafein, gerak badan, pola makan).
   - G. Catatan Keselamatan & Aturan Krisis (tanda waspada, deteksi otomatis kekhawatiran $\ge 7$ atau kata kunci risiko, memunculkan kartu bantuan darurat 119 ekstensi 8 dan menandai "Perlu Perhatian Segera").
4. **Riwayat Konseli**
   - Kalender bulanan, grafik tren suasana hati, durasi tidur, dan efektivitas latihan grounding.
   - Streak/konsistensi dengan bahasa suportif dan ramah.
   - Akses ringkasan mingguan jika disetujui dan dibagikan oleh konselor.
5. **Dasbor Konselor & Analisis AI Mingguan**
   - Triase konseli dengan pencarian, filter prioritas/keaktifan, dan lencana peringatan berbasis aturan.
   - Detail konseli lengkap dengan filter, inspeksi riwayat, dan ekspor CSV/JSON.
   - Agen AI Analisis Mingguan berbasis Gemini 3.8 Flash dengan skema keluaran terstruktur (JSON schema) dan catatan konselor yang dapat diedit.
   - Matriks mingguan seluruh konseli untuk pemrioritasan sesi.
   - Pengaturan nomor darurat dan pengelolaan daftar email konselor oleh Admin.

---

## Langkah Setup & Konfigurasi Lingkungan (Secrets)

Untuk menghubungkan aplikasi ke Google Drive resmi lembaga dan Gemini AI, atur variabel lingkungan berikut di panel **Settings > Secrets** atau file `.env`:

### 1. `GEMINI_API_KEY`
- Disediakan secara otomatis oleh Google AI Studio, atau dapatkan dari Google AI Studio Console.

### 2. `GOOGLE_CLIENT_ID`
1. Buka [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Klik **Create Credentials** -> **OAuth client ID** -> pilih **Web application**.
3. Tambahkan URL aplikasi (misal `https://ais-dev-....run.app` atau `http://localhost:3000`) ke **Authorized JavaScript origins**.
4. Salin Client ID ke variabel `GOOGLE_CLIENT_ID`.

### 3. `ADMIN_EMAIL`
- Alamat email Google admin lembaga yang memiliki wewenang mengelola daftar konselor (misal: `MiftahudinMubarok@gmail.com`).

### 4. `DRIVE_ROOT_FOLDER_ID` & `SERVICE_ACCOUNT_JSON`
1. Di Google Cloud Console, aktifkan **Google Drive API**.
2. Buka **IAM & Admin** -> **Service Accounts** -> **Create Service Account** (misal: `drive-storage-bot@project-id.iam.gserviceaccount.com`).
3. Buat kunci baru (**Keys** -> **Add Key** -> **Create new key** -> **JSON**).
4. Salin seluruh isi berkas JSON tersebut ke variabel `SERVICE_ACCOUNT_JSON`.
5. Buka [Google Drive](https://drive.google.com/), buat folder baru (misal: `Jurnal Konseling Lembaga`).
6. Bagikan folder tersebut ke email Service Account tadi dengan peran **Editor**.
7. Salin ID folder dari URL browser (bagian setelah `/folders/`) ke variabel `DRIVE_ROOT_FOLDER_ID`.

---

## Menjalankan Aplikasi

- Mode Pengujian / Demo:
  Aplikasi dapat langsung dijalankan tanpa kredensial eksternal. Sistem otomatis menggunakan driver penyimpanan lokal dengan 3 contoh kasus konseli dan tombol 1-klik login untuk menguji seluruh fitur (Konseli, Konselor, Admin).

- Perintah:
  - `npm run dev`: Menjalankan server full-stack Express + Vite development di port 3000.
  - `npm run build`: Membangun bundle produksi.
  - `npm run lint`: Memvalidasi tipe data TypeScript.
