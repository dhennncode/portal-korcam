// ==========================================================
// SHARED: kop surat + api helpers, dipakai index.html & admin.html
// ==========================================================

function renderKop({ title, headlineTitle, tagline, showHamburger }) {
  const el = document.getElementById("kop-mount");
  if (!el) return;
  el.innerHTML = `
    <div class="kop-wrap">
      <img class="kop-seal-bg" src="img/logo-ikip.png" alt="" />
      ${showHamburger ? `<button class="hamburger-btn" id="hamburger-btn" aria-label="Buka menu Struktur Korcam"><span></span></button>` : ""}
      <div class="kop">
        <img class="kop-logo" src="img/logo-ikip.png" alt="Logo IKIP PGRI Bojonegoro" />
        <div class="kop-text-block">
          <div class="kop-title">${title}</div>
        </div>
      </div>
      <div class="kop-rule"></div>
      <div class="kop-headline">
        <h1>${headlineTitle}</h1>
        <div class="tagline">${tagline}</div>
      </div>
    </div>
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
