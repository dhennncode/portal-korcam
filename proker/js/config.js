// ==========================================================
// KONFIGURASI — SUPABASE
// ==========================================================
// 1. Jalankan supabase/schema.sql di project Supabase kamu
//    (SQL Editor > New query) — boleh project yang SAMA dengan
//    modul "datawarga", tabelnya sudah diberi awalan "proker_".
// 2. Isi SUPABASE_URL & SUPABASE_ANON_KEY di bawah ini.
//    (Ambil dari Project Settings > API di dashboard Supabase.)
const SUPABASE_URL = "https://gyrzyxmmtpwjdsgsmxrc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yvfZ3mOm8CRnvv2tzBSDnQ_LRiZmAAs";

// Nama tabel (harus sama dengan supabase/schema.sql)
const TABLE_KELOMPOK = "proker_kelompok";
const TABLE_PROKER_MASTER = "proker_master";
const TABLE_LAPORAN = "proker_laporan";

if (!window.supabase) {
  console.error("Supabase JS belum dimuat.");
  alert("Supabase belum berhasil dimuat. Periksa koneksi internet / script CDN.");
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CONFIG = {
  // Dipakai sebagai fallback tampilan sebelum data dari tabel "proker_kelompok" masuk.
  DESA_LIST: ["Hargomulyo", "Kedewan", "Beji", "Wonocolo", "Kawengan"],

  MINGGU_BERJALAN_DEFAULT: 1, // ganti manual tiap minggu, atau pilih di form

  // Nomor surat tugas Korcam — ditampilkan di kop. Ganti kalau ada surat baru.
  NOMOR_SURAT_TUGAS: "009/KKM/IKIP PGRI/0.8/2026",

  // ---- Login Admin (khusus Korcam) ----
  // Peringatan: ini web statis tanpa server session, jadi ini BUKAN keamanan
  // tingkat tinggi — cukup untuk mencegah kordes/kelompok tidak sengaja
  // membuka dashboard. Ganti sandi ini kapan saja kalau perlu.
  ADMIN_NIM: "24320034",
  ADMIN_SANDI: "121205",

  // ---- Struktur Koordinator Kecamatan ----
  TIM_KORCAM: [
    { peran: "Ketua / Koordinator Kecamatan", nama: "Dedy Indra Setiawan", catatan: "NIM 24320034 · Pendidikan Teknologi Informasi" },
    { peran: "Sekretaris", nama: "Adinda Handayani", catatan: "" },
    { peran: "Bendahara", nama: "Johan Dwi Murtopo", catatan: "" },
  ],
};
