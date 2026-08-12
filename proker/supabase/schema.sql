-- =================================================================
--  SKEMA DATABASE — Monitoring Proker KKM Kecamatan Kedewan
--  Jalankan file ini di: Supabase Dashboard > SQL Editor > New query
--  (Aman dijalankan ulang / re-run, memakai "if not exists")
--
--  Menggantikan backend lama (Google Sheets + Apps Script) dengan
--  Supabase. Bisa pakai project Supabase yang SAMA dengan modul
--  "datawarga" — tabelnya sengaja diberi awalan "proker_" supaya
--  tidak bentrok dengan tabel modul lain (desa, kelompok, dst).
-- =================================================================

-- =================================================================
-- 1. KELOMPOK (pengganti tab "Kelompok" di Sheet)
--    Diisi manual oleh Korcam lewat SQL Editor / Table Editor,
--    sama seperti dulu isi tab "Kelompok" manual di Google Sheet.
-- =================================================================
create table if not exists proker_kelompok (
  id                 bigserial primary key,
  desa               text not null,
  nama_koordinator   text not null,
  kontak             text,
  created_at         timestamptz not null default now(),
  unique (desa, nama_koordinator)
);

-- Contoh isi (edit / hapus sesuai data asli, lalu jalankan manual):
-- insert into proker_kelompok (desa, nama_koordinator, kontak) values
--   ('Hargomulyo', 'Kelompok 1', '08xxxxxxxxxx'),
--   ('Hargomulyo', 'Kelompok 2', '08xxxxxxxxxx'),
--   ('Kedewan',    'Kelompok 3', '08xxxxxxxxxx'),
--   ('Kedewan',    'Kelompok 4', '08xxxxxxxxxx'),
--   ('Beji',       'Kelompok 5', '08xxxxxxxxxx'),
--   ('Beji',       'Kelompok 6', '08xxxxxxxxxx'),
--   ('Wonocolo',   'Kelompok 7', '08xxxxxxxxxx'),
--   ('Wonocolo',   'Kelompok 8', '08xxxxxxxxxx'),
--   ('Kawengan',   'Kelompok 9', '08xxxxxxxxxx'),
--   ('Kawengan',   'Kelompok 10', '08xxxxxxxxxx')
-- on conflict (desa, nama_koordinator) do nothing;

-- =================================================================
-- 2. PROKER MASTER (pengganti tab "ProkerMaster")
--    Diisi dari panel Admin (tab "Kelola Proker").
-- =================================================================
create table if not exists proker_master (
  id                 bigserial primary key,
  desa               text not null,
  nama_koordinator   text not null,
  nama_proker        text not null,
  created_at         timestamptz not null default now()
);

create index if not exists idx_proker_master_kelompok
  on proker_master (desa, nama_koordinator);

-- =================================================================
-- 3. LAPORAN MINGGUAN (pengganti tab "Laporan")
--    Satu baris per proker per kelompok per minggu — sama seperti
--    perilaku lama (satu submit form bisa jadi beberapa baris).
-- =================================================================
create table if not exists proker_laporan (
  id                   bigserial primary key,
  created_at           timestamptz not null default now(),
  minggu               int not null,
  desa                 text not null,
  nama_koordinator     text not null,
  nama_proker          text not null default '-',
  progres_proker       int not null default 0 check (progres_proker between 0 and 100),
  progres_pendataan    int not null default 0 check (progres_pendataan between 0 and 100),
  kendala              text,
  butuh_bantuan        text not null default 'Tidak' check (butuh_bantuan in ('Ya','Tidak')),
  status               text not null default 'Baru' check (status in ('Baru','Diproses','Selesai'))
);

create index if not exists idx_proker_laporan_minggu on proker_laporan (minggu);
create index if not exists idx_proker_laporan_desa    on proker_laporan (desa);
create index if not exists idx_proker_laporan_created on proker_laporan (created_at desc);

-- =================================================================
-- 4. ROW LEVEL SECURITY (RLS)
--    Catatan keamanan: sama seperti sistem lama, form publik ini
--    TIDAK punya login sungguhan — panel admin hanya dilindungi
--    password sederhana di sisi browser (lihat js/config.js:
--    ADMIN_NIM / ADMIN_SANDI). Jadi di level database, data ini
--    memang dibuat bisa dibaca siapa saja yang tahu URL webnya,
--    persis seperti perilaku Web App Apps Script sebelumnya.
--    Kalau nanti perlu proteksi sungguhan, tambahkan Supabase Auth.
-- =================================================================
alter table proker_kelompok enable row level security;
alter table proker_master   enable row level security;
alter table proker_laporan  enable row level security;

drop policy if exists "publik baca kelompok proker" on proker_kelompok;
create policy "publik baca kelompok proker" on proker_kelompok
  for select using (true);

drop policy if exists "publik baca proker master" on proker_master;
create policy "publik baca proker master" on proker_master
  for select using (true);

drop policy if exists "publik tambah proker master" on proker_master;
create policy "publik tambah proker master" on proker_master
  for insert with check (true);

drop policy if exists "publik baca laporan" on proker_laporan;
create policy "publik baca laporan" on proker_laporan
  for select using (true);

drop policy if exists "publik kirim laporan" on proker_laporan;
create policy "publik kirim laporan" on proker_laporan
  for insert with check (true);

-- =================================================================
-- SELESAI. Langkah selanjutnya:
--  1. Isi tabel proker_kelompok (lihat contoh INSERT di atas / edit manual).
--  2. Isi js/config.js dengan SUPABASE_URL & SUPABASE_ANON_KEY project ini
--     (boleh sama persis dengan yang dipakai modul datawarga).
--  3. Buka index.html (form publik) dan admin.html (panel Korcam) — data
--     akan langsung terbaca dari Supabase, tanpa Apps Script sama sekali.
-- =================================================================
