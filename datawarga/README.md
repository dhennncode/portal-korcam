# Data Warga KKM &mdash; Kecamatan Kedewan

Sistem pendataan kondisi rumah tangga warga untuk **seluruh Kecamatan
Kedewan** (5 desa &times; 10 kelompok KKM IKIP PGRI Bojonegoro), dibuat
sebagai level di atas web pendataan per-desa/per-kelompok yang sudah ada
sebelumnya (`datawarga`).

Bedanya dengan web lama:
- Web lama: 1 form khusus milik 1 kelompok di 1 desa (mis. "Kelompok 05,
  Desa Kedewan").
- Web ini: 1 form yang dipakai **semua kelompok se-kecamatan** — warga/
  mahasiswa memilih Desa lalu Kelompok saat mengisi, dan Korcam (kamu)
  bisa memantau semua data dari satu dashboard, dengan rekap per desa.

## Struktur folder

```
kecamatan-kedewan/
├── html/
│   ├── index.html      -> Formulir pendataan (dipakai semua kelompok)
│   └── admin.html       -> Dashboard admin (Korcam / Kordes)
├── css/
│   ├── style.css         -> Gaya umum (form, tombol, header)
│   └── admin.css          -> Gaya khusus dashboard admin
├── js/
│   ├── config.js           -> Kunci Supabase & daftar tabel (EDIT INI)
│   ├── script.js             -> Logika formulir publik
│   └── admin.js                -> Logika dashboard admin
├── assets/
│   └── logo-kkm-kedewan.png
├── supabase/
│   └── schema.sql             -> Skema database lengkap (desa, kelompok, survey, admin, RLS)
└── README.md
```

## Langkah 1 &mdash; Buat project Supabase baru

1. Buka [supabase.com](https://supabase.com) → **New project**.
2. Beri nama, misalnya `datawarga-kecamatan-kedewan`, pilih region terdekat
   (Singapore), simpan password database.
3. Setelah project selesai dibuat, buka **SQL Editor → New query**, tempel
   seluruh isi `supabase/schema.sql`, lalu klik **Run**.
   - Ini otomatis membuat tabel `desa` (5 baris), `kelompok` (10 baris,
     default 2 kelompok/desa — **edit sesuai pembagian sebenarnya**, lihat
     Langkah 2), `survey_rumah_tangga`, dan `admin_profil`, lengkap dengan
     Row Level Security.

## Langkah 2 &mdash; Sesuaikan pembagian kelompok per desa (jika perlu)

Skema default membagi kelompok 1–2 ke Hargomulyo, 3–4 ke Kedewan, 5–6 ke
Beji, 7–8 ke Wonocolo, 9–10 ke Kawengan. Kalau pembagian sebenarnya beda,
edit di **Table Editor → kelompok**, ubah kolom `desa_id` tiap baris agar
sesuai desa yang benar. Kolom `nama_ketua` boleh diisi manual kalau mau.

## Langkah 3 &mdash; Buat Storage bucket untuk foto

1. **Storage → New bucket** → nama: `bukti-survey` → **Private** (jangan
   dicentang public).
2. Buka tab **Policies** pada bucket ini, tambahkan:
   - Policy **INSERT** untuk role `anon` dan `authenticated`, `WITH CHECK: true`
     (supaya warga/mahasiswa di lapangan bisa upload foto tanpa login).
   - Policy **SELECT** untuk role `authenticated` saja, `USING: true`
     (supaya hanya admin yang login yang bisa melihat/mengunduh foto lewat
     signed URL).

## Langkah 4 &mdash; Buat akun admin (Korcam & Kordes)

1. **Authentication → Users → Add user** → isi email & password untuk
   dirimu sendiri (Korcam), ulangi untuk tiap Kordes desa jika perlu.
2. Salin **User UID** masing-masing akun.
3. Buka **Table Editor → admin_profil → Insert row**, isi:
   - `id` = User UID dari langkah 2
   - `nama` = nama admin
   - `role` = `korcam` (akses semua desa) atau `kordes` (akses 1 desa)
   - `desa_id` = kosongkan (NULL) untuk `korcam`; isi ID desa yang sesuai
     untuk `kordes`

> Korcam melihat data seluruh kecamatan + rekap per desa. Kordes hanya
> melihat & mengelola data desanya sendiri (dijamin oleh RLS di database,
> bukan cuma disembunyikan di tampilan).

## Langkah 5 &mdash; Isi `js/config.js`

Buka `js/config.js`, ganti:

```js
const SUPABASE_URL = "GANTI_DENGAN_SUPABASE_URL_PROJECT_KECAMATAN";
const SUPABASE_ANON_KEY = "GANTI_DENGAN_SUPABASE_ANON_KEY_PROJECT_KECAMATAN";
```

Nilainya diambil dari **Project Settings → API** di dashboard Supabase
project yang baru dibuat di Langkah 1 (pakai **anon public key**, bukan
`service_role`).

## Langkah 6 &mdash; Coba jalankan secara lokal

Karena semuanya file statis (HTML/CSS/JS), cukup buka `html/index.html`
langsung di browser, atau jalankan server lokal sederhana dari folder ini:

```bash
npx serve .
# lalu buka http://localhost:3000/html/index.html
# dan     http://localhost:3000/html/admin.html
```

## Langkah 7 &mdash; Deploy (opsional)

Upload seluruh folder `kecamatan-kedewan/` apa adanya ke hosting statis
seperti **Netlify**, **Vercel**, **GitHub Pages**, atau **Cloudflare
Pages**. Tidak perlu proses build — tinggal deploy foldernya. Bagikan:

- Link `.../html/index.html` ke seluruh mahasiswa/kelompok untuk mengisi
  data lapangan.
- Link `.../html/admin.html` khusus untuk Korcam & Kordes.

## Catatan tentang web monitoring proker yang sudah ada

Web `monitoring-proker-kedewan` (yang berbasis Google Sheets + Apps
Script) tetap bisa dipakai berdampingan untuk memantau **progres program
kerja mingguan**. Web ini (`kecamatan-kedewan`) khusus untuk **data
kondisi warga & rumah tangga**, dengan penyimpanan di Supabase supaya
foto KK/rumah bisa diunggah dan tersimpan rapi per baris data. Keduanya
independen, tidak perlu digabung, tapi bisa saling ditautkan lewat menu
di masing-masing web kalau diinginkan.

## Ringkasan alur data

1. Mahasiswa/kelompok membuka `index.html`, pilih **Desa** lalu
   **Kelompok**, isi data satu KK, upload 2 foto, kirim.
2. Data masuk ke tabel `survey_rumah_tangga` dengan `desa_id` &
   `kelompok_id` otomatis tersimpan.
3. Korcam/Kordes login di `admin.html`, memantau statistik total
   se-kecamatan, rekap per desa, memfilter per desa/kelompok/status,
   memverifikasi atau menolak data, dan mengekspor ke Excel.
