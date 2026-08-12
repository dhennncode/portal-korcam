# Monitoring Proker KKM — Kecamatan Kedewan (v3, Supabase)

Web sederhana (HTML/CSS/JS murni, tanpa framework) untuk memonitor proker dan
kendala tiap kelompok KKM, dengan **Supabase sebagai database** (sebelumnya
Google Sheets + Apps Script — sudah tidak dipakai lagi).

## Struktur folder

```
proker/
├── index.html            -> Formulir laporan mingguan (publik) + struktur Korcam
├── admin.html             -> Dashboard admin (dikunci NIM + sandi)
├── css/style.css
├── js/
│   ├── config.js            -> Kunci Supabase & nama tabel, data statis (EDIT INI)
│   ├── shared.js              -> Kop surat + helper query Supabase
│   ├── app.js                   -> Logika formulir publik
│   └── admin.js                   -> Logika dashboard admin
├── img/logo-ikip.png
└── supabase/
    └── schema.sql          -> Jalankan sekali di Supabase SQL Editor
```

## Cara setup

1. **Punya project Supabase.** Kalau kamu sudah pakai Supabase untuk modul
   `datawarga`, boleh pakai project yang **sama** — tabel di sini sengaja
   diberi awalan `proker_` supaya tidak bentrok.
2. Buka **Supabase Dashboard > SQL Editor > New query**, tempel isi
   `supabase/schema.sql`, lalu **Run**. Ini akan membuat 3 tabel:
   - `proker_kelompok` — daftar desa + nama koordinator/kelompok
   - `proker_master` — daftar proker per kelompok
   - `proker_laporan` — laporan mingguan (satu baris per proker)
3. Isi data awal `proker_kelompok` (siapa koordinator di desa mana). Ada
   contoh `insert` yang tinggal di-uncomment/edit di bagian atas
   `schema.sql`, atau isi manual lewat **Table Editor**.
4. Buka **Project Settings > API**, salin **Project URL** dan **anon public
   key**, tempel ke `js/config.js`:
   ```js
   const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "sb_publishable_xxxxxxxxxxxxxxxx";
   ```
5. Buka `index.html` — dropdown Desa & Kelompok akan otomatis terisi dari
   tabel `proker_kelompok`.
6. Login ke `admin.html` (NIM + sandi di `js/config.js`, default
   `24320034` / `121205` — **ganti ini**), lalu daftarkan proker tiap
   kelompok lewat tab "Kelola Proker" sebelum kelompok mulai lapor.

## Catatan keamanan

Sama seperti sebelumnya: form ini **tidak punya sistem login sungguhan** di
level database. `admin.html` hanya dikunci password sederhana di sisi
browser (`sessionStorage`), bukan Supabase Auth — jadi siapa pun yang tahu
`SUPABASE_URL` + `anon key` (yang memang ada di kode publik) secara teknis
bisa membaca/menulis tabel `proker_*` langsung lewat API Supabase, persis
seperti siapa pun yang tahu URL Web App Apps Script dulu bisa akses
`doGet`/`doPost`. Untuk laporan progres proker KKM ini risikonya rendah
(bukan data pribadi warga), tapi kalau nanti mau diperketat, tambahkan
Supabase Auth + kebijakan RLS berbasis `auth.uid()` (contoh polanya bisa
dilihat di `../datawarga/supabase/schema.sql`, yang membedakan role
`korcam` vs `kordes`).

## Migrasi dari versi lama (Apps Script)

Folder `apps-script/` (berisi `Code.gs`) sudah dihapus karena tidak dipakai
lagi. Kalau kamu masih punya data lama di Google Sheet ("Kelompok",
"ProkerMaster", "Laporan"), tinggal export tiap tab ke CSV lalu import ke
tabel Supabase yang sepadan lewat **Table Editor > Insert > Import data from
CSV** (cocokkan nama kolom: `Desa`→`desa`, `Nama Koordinator`→
`nama_koordinator`, `Nama Proker`→`nama_proker`, `Progres Proker (%)`→
`progres_proker`, `Progres Pendataan (%)`→`progres_pendataan`, `Butuh
Bantuan`→`butuh_bantuan`, `Status`→`status`, `Timestamp`→`created_at`).
