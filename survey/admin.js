/* ==========================================================================
   ADMIN — Survey Potensi Kecamatan Kedewan
   --------------------------------------------------------------------------
   File ini SENGAJA berdiri sendiri (tidak menyentuh script.js/style.css
   yang sudah ada) supaya aman ditambahkan manual ke folder survey/.

   WAJIB DICEK SEBELUM DIPAKAI
   1. SUPABASE_URL & SUPABASE_ANON_KEY di bawah HARUS SAMA PERSIS dengan
      yang ada di survey/script.js (satu project, satu tabel). Sudah saya
      salin otomatis dari script.js kamu — kalau nanti kamu ganti project
      Supabase, update juga di sini.
   2. ADMIN_NIM & ADMIN_SANDI — ganti dengan NIM/sandi korcam kamu sendiri.
      Ini BUKAN sistem keamanan tingkat tinggi (murni cek di sisi browser),
      tapi cukup untuk mencegah orang lain iseng buka panel admin.
   3. Supabase table "survey_data" harus punya kolom "id" (primary key) dan
      "created_at" (timestamptz, default now()) supaya urutan & hapus data
      bisa jalan. Kalau tabel kamu dibuat lewat dashboard Supabase, kolom
      ini biasanya sudah otomatis ada.
   4. RLS (Row Level Security): supaya panel ini bisa MEMBACA & MENGHAPUS
      data, role "anon" perlu policy SELECT dan DELETE di tabel
      "survey_data" (lihat instruksi penerapan yang saya berikan di chat).
   ========================================================================== */

const SUPABASE_URL = "https://opvcdgzwiriaafcodocn.supabase.co"; // <-- samakan dengan script.js
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wdmNkZ3p3aXJpYWFmY29kb2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMDg2MDMsImV4cCI6MjEwMTc4NDYwM30.jD6E_M_-GsVrDJBAJW_mrhJDDn6np41aUouiOafSnoU"; // <-- samakan dengan script.js

const STORAGE_BUCKET = "survey-photos";
const TABLE_NAME = "survey_data";

const ADMIN_NIM = "24320034";     // <-- GANTI
const ADMIN_SANDI = "121205";  // <-- GANTI

const DESA_LIST = ["Beji", "Hargomulyo", "Kawengan", "Kedewan", "Wonocolo"];
const KATEGORI_LIST = [
    "Bangunan", "Industri", "Olahraga", "Pariwisata Seni dan Budaya", "Pemerintahan",
    "Pendidikan", "Peribadatan", "Sarana Kesehatan", "Sosial", "Transportasi",
    "Perekonomian/Perdagangan", "Pemakaman", "Permukiman", "Pertahanan dan Keamanan", "Lainnya",
];

const SESSION_KEY = "survey_admin_session";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STATE = {
    rows: [],
    loading: true,
    filterDesa: "Semua",
    filterKategori: "Semua",
    filterKelompok: "Semua",
    search: "",
};

/* ---------------------------------------------------------------------------
   Login gate
--------------------------------------------------------------------------- */
function initLogin() {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
        enterAdmin();
        return;
    }
    document.getElementById("login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const nim = document.getElementById("login-nim").value.trim();
        const sandi = document.getElementById("login-sandi").value.trim();
        if (nim === ADMIN_NIM && sandi === ADMIN_SANDI) {
            sessionStorage.setItem(SESSION_KEY, "1");
            enterAdmin();
        } else {
            document.getElementById("login-error").style.display = "block";
        }
    });
}

function enterAdmin() {
    document.getElementById("login-shell").style.display = "none";
    document.getElementById("admin-shell").classList.add("active");
    document.getElementById("logout-btn").addEventListener("click", () => {
        sessionStorage.removeItem(SESSION_KEY);
        location.reload();
    });
    document.getElementById("refresh-btn").addEventListener("click", loadData);
    document.getElementById("export-btn").addEventListener("click", exportCsv);
    initFilters();
    initLightbox();
    loadData();
}

/* ---------------------------------------------------------------------------
   Load data
--------------------------------------------------------------------------- */
async function loadData() {
    STATE.loading = true;
    renderAll();
    try {
        const { data, error } = await supabaseClient
            .from(TABLE_NAME)
            .select("*")
            .order("created_at", { ascending: false });
        if (error) throw new Error(error.message);
        STATE.rows = data || [];
        hideError();
    } catch (err) {
        showError("Gagal memuat data: " + err.message);
        STATE.rows = [];
    } finally {
        STATE.loading = false;
        renderAll();
    }
}

/* ---------------------------------------------------------------------------
   Filters
--------------------------------------------------------------------------- */
function initFilters() {
    const desaSel = document.getElementById("filter-desa");
    desaSel.innerHTML = `<option value="Semua">Semua Desa</option>` +
        DESA_LIST.map((d) => `<option value="${d}">${d}</option>`).join("");
    desaSel.addEventListener("change", (e) => { STATE.filterDesa = e.target.value; renderList(); });

    const katSel = document.getElementById("filter-kategori");
    katSel.innerHTML = `<option value="Semua">Semua Kategori</option>` +
        KATEGORI_LIST.map((k) => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join("");
    katSel.addEventListener("change", (e) => { STATE.filterKategori = e.target.value; renderList(); });

    document.getElementById("filter-kelompok").addEventListener("change", (e) => {
        STATE.filterKelompok = e.target.value; renderList();
    });

    const searchInput = document.getElementById("filter-search");
    searchInput.addEventListener("input", (e) => { STATE.search = e.target.value.trim().toLowerCase(); renderList(); });

    document.getElementById("reset-filter-btn").addEventListener("click", () => {
        STATE.filterDesa = "Semua"; STATE.filterKategori = "Semua"; STATE.filterKelompok = "Semua"; STATE.search = "";
        desaSel.value = "Semua"; katSel.value = "Semua"; searchInput.value = "";
        document.getElementById("filter-kelompok").value = "Semua";
        renderList();
    });
}

function getKelompokList() {
    return [...new Set(STATE.rows.map((r) => r.kelompok_kkm).filter(Boolean))].sort();
}

function renderKelompokOptions() {
    const sel = document.getElementById("filter-kelompok");
    const current = sel.value || "Semua";
    sel.innerHTML = `<option value="Semua">Semua Kelompok</option>` +
        getKelompokList().map((k) => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join("");
    sel.value = current;
}

function filteredRows() {
    return STATE.rows.filter((r) => {
        if (STATE.filterDesa !== "Semua" && r.desa !== STATE.filterDesa) return false;
        if (STATE.filterKategori !== "Semua" && r.kategori !== STATE.filterKategori) return false;
        if (STATE.filterKelompok !== "Semua" && r.kelompok_kkm !== STATE.filterKelompok) return false;
        if (STATE.search) {
            const hay = [r.nama_objek, r.nama_surveyor, r.desa, r.dusun, r.kelompok_kkm]
                .filter(Boolean).join(" ").toLowerCase();
            if (!hay.includes(STATE.search)) return false;
        }
        return true;
    });
}

/* ---------------------------------------------------------------------------
   Render
--------------------------------------------------------------------------- */
function renderAll() {
    renderStats();
    renderKelompokOptions();
    renderList();
}

function renderStats() {
    const rows = STATE.rows;
    const totalDesa = new Set(rows.map((r) => r.desa).filter(Boolean)).size;
    const now = Date.now();
    const minggu = rows.filter((r) => r.created_at && (now - new Date(r.created_at).getTime()) <= 7 * 24 * 3600 * 1000).length;

    const kategoriCount = {};
    rows.forEach((r) => { if (r.kategori) kategoriCount[r.kategori] = (kategoriCount[r.kategori] || 0) + 1; });
    let topKategori = "-";
    let topN = 0;
    Object.entries(kategoriCount).forEach(([k, n]) => { if (n > topN) { topN = n; topKategori = k; } });

    document.getElementById("stat-total").textContent = rows.length;
    document.getElementById("stat-desa").textContent = totalDesa;
    document.getElementById("stat-minggu").textContent = minggu;
    document.getElementById("stat-kategori").textContent = topKategori;
}

function statusPeta(r) {
    if (r.link_lokasi) return `<a class="mini-link" href="${escapeHtml(r.link_lokasi)}" target="_blank" rel="noopener">Lihat peta &rarr;</a>`;
    if (r.latitude && r.longitude) return `<a class="mini-link" href="https://www.google.com/maps?q=${r.latitude},${r.longitude}" target="_blank" rel="noopener">Lihat peta &rarr;</a>`;
    return "";
}

function renderList() {
    const listEl = document.getElementById("data-list");
    const loadingEl = document.getElementById("data-loading");
    const emptyEl = document.getElementById("data-empty");
    const countEl = document.getElementById("result-count");

    loadingEl.style.display = STATE.loading ? "block" : "none";
    if (STATE.loading) { listEl.innerHTML = ""; emptyEl.style.display = "none"; countEl.textContent = ""; return; }

    const rows = filteredRows();
    countEl.textContent = `Menampilkan ${rows.length} dari ${STATE.rows.length} entri`;

    if (!rows.length) {
        listEl.innerHTML = "";
        emptyEl.style.display = "block";
        return;
    }
    emptyEl.style.display = "none";

    listEl.innerHTML = rows.map((r) => {
        const photos = Array.isArray(r.foto_urls) ? r.foto_urls : [];
        const photosHtml = photos.length
            ? `<div class="entry-photos">${photos.map((u) => `<img src="${escapeHtml(u)}" alt="Foto ${escapeHtml(r.nama_objek || "")}" class="entry-thumb" data-full="${escapeHtml(u)}" loading="lazy">`).join("")}</div>`
            : `<p class="muted small">Tidak ada foto.</p>`;

        return `
        <article class="entry-card">
            <div class="entry-head">
                <div>
                    <span class="badge">${escapeHtml(r.kategori || "-")}</span>
                    <h3 class="entry-title">${escapeHtml(r.nama_objek || "(tanpa nama)")}</h3>
                    <p class="entry-loc">${escapeHtml(r.desa || "-")}${r.dusun ? " &middot; Dusun " + escapeHtml(r.dusun) : ""}</p>
                </div>
                <button class="icon-btn danger" title="Hapus entri" data-id="${r.id}">&times;</button>
            </div>

            <dl class="entry-meta">
                <div><dt>Surveyor</dt><dd>${escapeHtml(r.nama_surveyor || "-")}</dd></div>
                <div><dt>WhatsApp</dt><dd>${escapeHtml(r.no_whatsapp || "-")}</dd></div>
                <div><dt>Kelompok KKM</dt><dd>${escapeHtml(r.kelompok_kkm || "-")}</dd></div>
                <div><dt>Dikirim</dt><dd>${r.created_at ? new Date(r.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-"}</dd></div>
            </dl>

            <div class="entry-text">
                <p><strong>Potensi:</strong> ${escapeHtml(r.potensi || "-")}</p>
                <p><strong>Kondisi:</strong> ${escapeHtml(r.kondisi || "-")}</p>
                ${r.permasalahan ? `<p><strong>Permasalahan:</strong> ${escapeHtml(r.permasalahan)}</p>` : ""}
                ${statusPeta(r)}
            </div>

            ${photosHtml}
        </article>`;
    }).join("");

    listEl.querySelectorAll(".entry-thumb").forEach((img) => {
        img.addEventListener("click", () => openLightbox(img.dataset.full));
    });
    listEl.querySelectorAll(".icon-btn.danger").forEach((btn) => {
        btn.addEventListener("click", () => deleteEntry(btn.dataset.id));
    });
}

/* ---------------------------------------------------------------------------
   Delete
--------------------------------------------------------------------------- */
async function deleteEntry(id) {
    const row = STATE.rows.find((r) => String(r.id) === String(id));
    if (!row) return;
    const ok = confirm(`Hapus data "${row.nama_objek || "entri ini"}"? Tindakan ini tidak bisa dibatalkan.`);
    if (!ok) return;

    try {
        const { error } = await supabaseClient.from(TABLE_NAME).delete().eq("id", id);
        if (error) throw new Error(error.message);

        // Best-effort: hapus juga foto terkait di storage (tidak menggagalkan proses jika error).
        if (Array.isArray(row.foto_urls) && row.foto_urls.length) {
            const paths = row.foto_urls.map((u) => {
                const marker = `/${STORAGE_BUCKET}/`;
                const idx = u.indexOf(marker);
                return idx >= 0 ? u.slice(idx + marker.length) : null;
            }).filter(Boolean);
            if (paths.length) {
                supabaseClient.storage.from(STORAGE_BUCKET).remove(paths).catch(() => { });
            }
        }

        showToast("Data berhasil dihapus.");
        STATE.rows = STATE.rows.filter((r) => String(r.id) !== String(id));
        renderAll();
    } catch (err) {
        showToast("Gagal menghapus: " + err.message, true);
    }
}

/* ---------------------------------------------------------------------------
   Lightbox
--------------------------------------------------------------------------- */
function initLightbox() {
    document.getElementById("lightbox").addEventListener("click", closeLightbox);
}
function openLightbox(url) {
    const lb = document.getElementById("lightbox");
    document.getElementById("lightbox-img").src = url;
    lb.classList.add("active");
}
function closeLightbox() {
    document.getElementById("lightbox").classList.remove("active");
    document.getElementById("lightbox-img").src = "";
}

/* ---------------------------------------------------------------------------
   Export CSV
--------------------------------------------------------------------------- */
function exportCsv() {
    const rows = filteredRows();
    if (!rows.length) { showToast("Tidak ada data untuk diekspor.", true); return; }

    const cols = ["created_at", "nama_surveyor", "no_whatsapp", "kelompok_kkm", "desa", "dusun",
        "nama_objek", "kategori", "latitude", "longitude", "link_lokasi", "potensi", "kondisi", "permasalahan"];
    const escapeCsv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const csv = [cols.join(",")].concat(
        rows.map((r) => cols.map((c) => escapeCsv(r[c])).join(","))
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `survey-potensi-kedewan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------------------------
   Helpers
--------------------------------------------------------------------------- */
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}
function showError(msg) {
    const box = document.getElementById("error-box");
    box.textContent = "\u26A0 " + msg;
    box.style.display = "block";
}
function hideError() {
    document.getElementById("error-box").style.display = "none";
}
function showToast(msg, isError) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.className = "toast show" + (isError ? " toast-error" : "");
    setTimeout(() => { t.className = "toast"; }, 2600);
}

document.addEventListener("DOMContentLoaded", initLogin);