// ============================================================
// CONFIG.JS
// DATA WARGA KKM KECAMATAN KEDEWAN
// ============================================================

const SUPABASE_URL =
  "https://gyrzyxmmtpwjdsgsmxrc.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_yvfZ3mOm8CRnvv2tzBSDnQ_LRiZmAAs";

const BUCKET_NAME = "bukti-survey";

const TABLE_SURVEY = "survey_rumah_tangga";
const TABLE_DESA = "desa";
const TABLE_KELOMPOK = "kelompok";
const TABLE_ADMIN_PROFIL = "admin_profil";

const IDENTITAS_KKM = {
  judul: "KKM IKIP PGRI Bojonegoro",
  kecamatan: "Kecamatan Kedewan",
  tahun: 2026
};


// ============================================================
// CEK SUPABASE LIBRARY
// ============================================================

if (!window.supabase) {
  console.error("Supabase JS belum dimuat.");
  alert("Supabase belum berhasil dimuat. Periksa script CDN.");
}


// ============================================================
// SUPABASE CLIENT
// ============================================================

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log("Supabase berhasil diinisialisasi.");