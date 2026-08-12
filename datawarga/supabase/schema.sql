-- =================================================================
--  SKEMA DATABASE — Data Warga KKM Kecamatan Kedewan
--  Jalankan file ini di: Supabase Dashboard > SQL Editor > New query
--  (Aman dijalankan ulang / re-run, memakai "if not exists")
-- =================================================================

create extension if not exists "pgcrypto";

-- =================================================================
-- 1. MASTER DESA (5 desa se-Kecamatan Kedewan)
-- =================================================================
create table if not exists desa (
  id      serial primary key,
  nama    text not null unique,
  urutan  int  not null
);

insert into desa (nama, urutan) values
  ('Hargomulyo', 1),
  ('Kedewan',    2),
  ('Beji',       3),
  ('Wonocolo',   4),
  ('Kawengan',   5)
on conflict (nama) do nothing;

-- =================================================================
-- 2. MASTER KELOMPOK (10 kelompok KKM se-kecamatan)
--    Silakan EDIT pembagian desa_id di bawah sesuai penempatan
--    kelompok yang sebenarnya (lihat juga js/config.js).
-- =================================================================
create table if not exists kelompok (
  id           serial primary key,
  nomor        int  not null unique check (nomor between 1 and 10),
  desa_id      int  not null references desa(id),
  nama_ketua   text,
  keterangan   text
);

insert into kelompok (nomor, desa_id)
select v.nomor, d.id
from (values
  (1,  'Hargomulyo'),
  (2,  'Hargomulyo'),
  (3,  'Kedewan'),
  (4,  'Kedewan'),
  (5,  'Beji'),
  (6,  'Beji'),
  (7,  'Wonocolo'),
  (8,  'Wonocolo'),
  (9,  'Kawengan'),
  (10, 'Kawengan')
) as v(nomor, nama_desa)
join desa d on d.nama = v.nama_desa
on conflict (nomor) do nothing;

-- =================================================================
-- 3. DATA SURVEY RUMAH TANGGA (data warga hasil pendataan lapangan)
-- =================================================================
create table if not exists survey_rumah_tangga (
  id               uuid primary key default gen_random_uuid(),

  kelompok_id      int  not null references kelompok(id),
  desa_id          int  not null references desa(id),

  nama_kepala_keluarga  text not null,
  nomor_kk              text not null,
  nik                   text not null,
  pekerjaan             text not null,

  alamat  text not null,
  rt      text not null,
  rw      text not null,

  foto_kk_url     text,
  foto_rumah_url  text,

  status_desil        text not null check (
    status_desil in ('tidak_terdaftar','1','2','3','4','5','6','7','8','9','10')
  ),
  anak_ingin_kuliah    boolean not null default false,

  rumah_lantai_tanah      boolean not null default false,
  belum_ada_listrik       boolean not null default false,
  anak_tidak_sekolah      boolean not null default false,
  nama_anak_tidak_sekolah jsonb   not null default '[]',

  status_verifikasi  text not null default 'menunggu' check (
    status_verifikasi in ('menunggu','terverifikasi','ditolak')
  ),
  catatan_admin  text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_survey_kelompok on survey_rumah_tangga(kelompok_id);
create index if not exists idx_survey_desa     on survey_rumah_tangga(desa_id);
create index if not exists idx_survey_status   on survey_rumah_tangga(status_verifikasi);
create index if not exists idx_survey_created  on survey_rumah_tangga(created_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_survey_updated_at on survey_rumah_tangga;
create trigger trg_survey_updated_at
before update on survey_rumah_tangga
for each row execute function set_updated_at();

-- =================================================================
-- 4. PROFIL ADMIN (Korcam = akses semua desa, Kordes = akses 1 desa)
--    Baris di tabel ini dibuat MANUAL setelah akun dibuat di
--    Authentication > Users (lihat README.md langkah 4).
-- =================================================================
create table if not exists admin_profil (
  id          uuid primary key references auth.users(id) on delete cascade,
  nama        text not null,
  role        text not null default 'kordes' check (role in ('korcam','kordes')),
  desa_id     int references desa(id), -- NULL jika role = korcam (akses semua desa)
  created_at  timestamptz not null default now()
);

-- =================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =================================================================
alter table desa                  enable row level security;
alter table kelompok              enable row level security;
alter table survey_rumah_tangga   enable row level security;
alter table admin_profil          enable row level security;

-- Semua orang (termasuk anonim) boleh BACA daftar desa & kelompok,
-- supaya dropdown di formulir lapangan bisa terisi.
drop policy if exists "publik baca desa" on desa;
create policy "publik baca desa" on desa for select using (true);

drop policy if exists "publik baca kelompok" on kelompok;
create policy "publik baca kelompok" on kelompok for select using (true);

-- Publik (anonim) boleh MENGIRIM (insert) data survey dari formulir,
-- tapi TIDAK boleh membaca / mengubah / menghapus data warga lain.
drop policy if exists "publik input survey" on survey_rumah_tangga;
create policy "publik input survey" on survey_rumah_tangga
  for insert with check (true);

-- Akun "korcam" boleh membaca/mengubah/menghapus data SEMUA desa.
-- Akun "kordes" hanya boleh membaca/mengubah/menghapus data DESA-nya sendiri.
drop policy if exists "admin baca survey" on survey_rumah_tangga;
create policy "admin baca survey" on survey_rumah_tangga
  for select using (
    exists (
      select 1 from admin_profil p
      where p.id = auth.uid()
        and (p.role = 'korcam' or p.desa_id = survey_rumah_tangga.desa_id)
    )
  );

drop policy if exists "admin update survey" on survey_rumah_tangga;
create policy "admin update survey" on survey_rumah_tangga
  for update using (
    exists (
      select 1 from admin_profil p
      where p.id = auth.uid()
        and (p.role = 'korcam' or p.desa_id = survey_rumah_tangga.desa_id)
    )
  );

drop policy if exists "admin hapus survey" on survey_rumah_tangga;
create policy "admin hapus survey" on survey_rumah_tangga
  for delete using (
    exists (
      select 1 from admin_profil p
      where p.id = auth.uid()
        and (p.role = 'korcam' or p.desa_id = survey_rumah_tangga.desa_id)
    )
  );

-- Seseorang hanya boleh membaca baris profilnya sendiri (untuk cek role & desa).
drop policy if exists "profil baca diri sendiri" on admin_profil;
create policy "profil baca diri sendiri" on admin_profil
  for select using (id = auth.uid());

-- =================================================================
-- SELESAI. Langkah selanjutnya ada di README.md:
--  - Buat Storage bucket privat "bukti-survey"
--  - Buat akun admin di Authentication > Users
--  - Tambahkan baris admin_profil untuk akun tsb
--  - Isi js/config.js dengan URL & anon key project ini
-- =================================================================
