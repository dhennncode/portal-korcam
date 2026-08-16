// ==========================================================
// SHARED: kop surat + api helpers, dipakai index.html & admin.html
// ==========================================================

function renderKop({ eyebrow, headlineTitle, tagline, showStrukturLink }) {
  const el = document.getElementById("kop-mount");
  if (!el) return;
  el.innerHTML = `
    <div class="topbar"><a class="back-link" href="../index.html">&larr; Menu Utama</a></div>
    <header class="kop">
      ${showStrukturLink ? `
      <a class="kop-struktur-btn" href="../struktur.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Struktur Korcam
      </a>` : ""}
      <div class="kop-head-row">
        <img class="kop-logo" src="../shared/img/logo-korcam.png" alt="Logo Korcam KKM IKIP PGRI Bojonegoro">
        <p class="kop-eyebrow" style="margin:0;">${eyebrow}</p>
      </div>
      <h1 class="kop-title">${headlineTitle}</h1>
      <p class="kop-sub">${tagline}</p>
      <div class="kop-stripe"></div>
    </header>
  `;
}

// ==========================================================
// API HELPERS (Supabase)
// ==========================================================
async function apiGet() {
  const [kelompokRes, prokerRes, laporanRes] = await Promise.all([
    supabaseClient.from(TABLE_KELOMPOK).select("*").order("desa", { ascending: true }),
    supabaseClient.from(TABLE_PROKER_MASTER).select("*"),
    supabaseClient.from(TABLE_LAPORAN).select("*").order("created_at", { ascending: false }),
  ]);

  if (kelompokRes.error) throw new Error("Gagal memuat data kelompok: " + kelompokRes.error.message);
  if (prokerRes.error) throw new Error("Gagal memuat data proker: " + prokerRes.error.message);
  if (laporanRes.error) throw new Error("Gagal memuat data laporan: " + laporanRes.error.message);

  return {
    kelompok: kelompokRes.data || [],
    prokerMaster: prokerRes.data || [],
    laporan: laporanRes.data || [],
  };
}

// Kirim laporan mingguan — satu baris per proker (sama seperti sebelumnya).
async function apiPostLaporan(payload) {
  const items = payload.prokerItems && payload.prokerItems.length
    ? payload.prokerItems
    : [{ nama: "-", persen: 0 }];

  const rows = items.map((item) => ({
    minggu: Number(payload.minggu) || null,
    desa: payload.desa || "",
    nama_koordinator: payload.kelompok || "",
    nama_proker: item.nama || "-",
    progres_proker: Number(item.persen) || 0,
    progres_pendataan: Number(payload.progresPendataan) || 0,
    kendala: payload.kendala || "",
    butuh_bantuan: payload.butuhBantuan || "Tidak",
    status: payload.status || "Baru",
  }));

  const { error } = await supabaseClient.from(TABLE_LAPORAN).insert(rows);
  if (error) throw new Error("Gagal mengirim laporan: " + error.message);
}

// Tambah satu proker baru ke ProkerMaster (dipakai panel admin).
async function apiPostProker(payload) {
  const { error } = await supabaseClient.from(TABLE_PROKER_MASTER).insert([
    {
      desa: payload.desa || "",
      nama_koordinator: payload.kelompok || "",
      nama_proker: payload.namaProker || "",
    },
  ]);
  if (error) throw new Error("Gagal menambah proker: " + error.message);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function showToastOn(id, msg, isError) {
  const t = document.getElementById(id);
  if (!t) return;
  t.textContent = msg;
  t.className = "toast show" + (isError ? " toast-error" : "");
  setTimeout(() => (t.className = "toast"), 2600);
}
