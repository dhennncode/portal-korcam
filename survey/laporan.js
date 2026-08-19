/* ==========================================================================
   LAPORAN PDF — Survey Potensi Kecamatan Kedewan
   --------------------------------------------------------------------------
   File ini SENGAJA berdiri sendiri (tidak menyentuh script.js/admin.js yang
   sudah ada) supaya aman ditambahkan begitu saja ke folder survey/.

   WAJIB DICEK SEBELUM DIPAKAI
   1. SUPABASE_URL & SUPABASE_ANON_KEY di bawah HARUS SAMA PERSIS dengan
      yang ada di survey/script.js dan survey/admin.js.
   2. ADMIN_NIM & ADMIN_SANDI HARUS SAMA PERSIS dengan yang ada di admin.js
      (satu sesi login dipakai bersama lewat sessionStorage).
   ========================================================================== */

const SUPABASE_URL = "https://opvcdgzwiriaafcodocn.supabase.co"; // <-- samakan dengan script.js & admin.js
const SUPABASE_ANON_KEY = "sb_publishable_RJTsH93YwtklXmuhOE6Jaw_nX33RbhU"; // <-- samakan dengan script.js & admin.js
const TABLE_NAME = "survey_data";

const ADMIN_NIM = "24320034";     // <-- GANTI, samakan dengan admin.js
const ADMIN_SANDI = "kedewan26";  // <-- GANTI, samakan dengan admin.js
const SESSION_KEY = "survey_admin_session"; // sama dengan admin.js — 1x login berlaku untuk keduanya

const DESA_LIST = ["Beji", "Hargomulyo", "Kawengan", "Kedewan", "Wonocolo"];
const KATEGORI_LIST = [
    "Bangunan", "Industri", "Olahraga", "Pariwisata Seni dan Budaya", "Pemerintahan",
    "Pendidikan", "Peribadatan", "Sarana Kesehatan", "Sosial", "Transportasi",
    "Perekonomian/Perdagangan", "Pemakaman", "Permukiman", "Pertahanan dan Keamanan", "Lainnya",
];

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STATE = { rows: [], filterDesa: "Semua", filterKategori: "Semua" };

/* ---------------------------------------------------------------------------
   Login gate (sesi sama dengan admin.html)
--------------------------------------------------------------------------- */
function initLogin() {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
        enterLaporan();
        return;
    }
    document.getElementById("login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const nim = document.getElementById("login-nim").value.trim();
        const sandi = document.getElementById("login-sandi").value.trim();
        if (nim === ADMIN_NIM && sandi === ADMIN_SANDI) {
            sessionStorage.setItem(SESSION_KEY, "1");
            enterLaporan();
        } else {
            document.getElementById("login-error").style.display = "block";
        }
    });
}

function enterLaporan() {
    document.getElementById("login-shell").style.display = "none";
    document.getElementById("laporan-shell").style.display = "block";
    initFilters();
    document.getElementById("print-btn").addEventListener("click", () => window.print());
    loadData();
}

/* ---------------------------------------------------------------------------
   Filters
--------------------------------------------------------------------------- */
function initFilters() {
    const desaSel = document.getElementById("filter-desa");
    desaSel.innerHTML = `<option value="Semua">Semua Desa</option>` +
        DESA_LIST.map((d) => `<option value="${d}">${d}</option>`).join("");
    desaSel.addEventListener("change", (e) => { STATE.filterDesa = e.target.value; render(); });

    const katSel = document.getElementById("filter-kategori");
    katSel.innerHTML = `<option value="Semua">Semua Kategori</option>` +
        KATEGORI_LIST.map((k) => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join("");
    katSel.addEventListener("change", (e) => { STATE.filterKategori = e.target.value; render(); });
}

/* ---------------------------------------------------------------------------
   Load
--------------------------------------------------------------------------- */
async function loadData() {
    const statusEl = document.getElementById("load-status");
    try {
        const { data, error } = await supabaseClient
            .from(TABLE_NAME).select("*").order("desa", { ascending: true }).order("nama_objek", { ascending: true });
        if (error) throw new Error(error.message);
        STATE.rows = data || [];
        statusEl.textContent = `${STATE.rows.length} entri dimuat.`;
    } catch (err) {
        statusEl.textContent = "Gagal memuat data: " + err.message;
    }
    render();
}

function filteredRows() {
    return STATE.rows.filter((r) => {
        if (STATE.filterDesa !== "Semua" && r.desa !== STATE.filterDesa) return false;
        if (STATE.filterKategori !== "Semua" && r.kategori !== STATE.filterKategori) return false;
        return true;
    });
}

/* ---------------------------------------------------------------------------
   Render laporan
--------------------------------------------------------------------------- */
function render() {
    const root = document.getElementById("report-root");
    const emptyEl = document.getElementById("empty-state");
    const rows = filteredRows();

    if (!rows.length) {
        root.classList.remove("ready");
        root.innerHTML = "";
        emptyEl.style.display = "block";
        return;
    }
    emptyEl.style.display = "none";
    root.classList.add("ready");

    const tanggal = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const desaSet = [...new Set(rows.map((r) => r.desa).filter(Boolean))];
    const cakupan = STATE.filterDesa === "Semua" ? "Seluruh Kecamatan Kedewan" : `Desa ${STATE.filterDesa}`;

    root.innerHTML = coverPage(rows, tanggal, cakupan) + ringkasanPage(rows, desaSet) + desaPages(rows);
}

function coverPage(rows, tanggal, cakupan) {
    return `
    <section class="sheet cover">
        <img class="cover__logo" src="../shared/img/logo-korcam.png" alt="Logo Korcam KKM IKIP PGRI Bojonegoro">
        <p class="cover__eyebrow">KKM &middot; IKIP PGRI Bojonegoro &middot; Koordinator Kecamatan</p>
        <h1 class="cover__title">Laporan Potensi Wisata &amp; Objek Desa Kecamatan Kedewan</h1>
        <p class="cover__sub">Hasil pendataan lapangan oleh mahasiswa KKM (Kuliah Kerja Mahasiswa) di seluruh desa Kecamatan Kedewan, Kabupaten Bojonegoro.</p>
        <div class="cover__rule"></div>
        <dl class="cover__meta">
            <div><dt>Cakupan</dt><dd>${escapeHtml(cakupan)}</dd></div>
            <div><dt>Total Entri</dt><dd>${rows.length}</dd></div>
            <div><dt>Tanggal Cetak</dt><dd>${tanggal}</dd></div>
        </dl>
        <p class="cover__footer">Dokumen ini dihasilkan otomatis dari Portal KKM Kedewan &middot; portal-korcam.vercel.app</p>
    </section>`;
}

function ringkasanPage(rows, desaSet) {
    const kategoriCount = {};
    rows.forEach((r) => { if (r.kategori) kategoriCount[r.kategori] = (kategoriCount[r.kategori] || 0) + 1; });
    const kategoriRows = Object.entries(kategoriCount).sort((a, b) => b[1] - a[1]);

    const desaCount = {};
    rows.forEach((r) => { if (r.desa) desaCount[r.desa] = (desaCount[r.desa] || 0) + 1; });
    const desaRows = DESA_LIST.filter((d) => desaCount[d]).map((d) => [d, desaCount[d]]);

    return `
    <section class="sheet">
        ${kop()}
        <h2 class="section-title">Ringkasan Eksekutif</h2>
        <p class="section-desc">Gambaran umum hasil pendataan potensi desa se-Kecamatan Kedewan.</p>

        <div class="stat-row">
            <div class="stat-box"><b>${rows.length}</b><span>Total Entri</span></div>
            <div class="stat-box"><b>${desaSet.length}</b><span>Desa Tercakup</span></div>
            <div class="stat-box"><b>${kategoriRows.length}</b><span>Kategori</span></div>
            <div class="stat-box"><b>${rows.filter((r) => Array.isArray(r.foto_urls) && r.foto_urls.length).length}</b><span>Berfoto</span></div>
        </div>

        <table class="rekap">
            <thead><tr><th>Desa</th><th class="num">Jumlah Objek</th></tr></thead>
            <tbody>
                ${desaRows.map(([d, n]) => `<tr><td>${escapeHtml(d)}</td><td class="num">${n}</td></tr>`).join("")}
                <tr><td>Total</td><td class="num">${rows.length}</td></tr>
            </tbody>
        </table>

        <table class="rekap">
            <thead><tr><th>Kategori</th><th class="num">Jumlah</th></tr></thead>
            <tbody>
                ${kategoriRows.map(([k, n]) => `<tr><td>${escapeHtml(k)}</td><td class="num">${n}</td></tr>`).join("")}
            </tbody>
        </table>

        ${foot()}
    </section>`;
}

function desaPages(rows) {
    const order = DESA_LIST.filter((d) => rows.some((r) => r.desa === d));
    return order.map((desa) => {
        const items = rows.filter((r) => r.desa === desa);
        return `
        <section class="sheet">
            ${kop()}
            <div class="desa-heading">Desa ${escapeHtml(desa)} <span class="count">${items.length} objek</span></div>
            ${items.map(objCard).join("")}
            ${foot()}
        </section>`;
    }).join("");
}

function objCard(r) {
    const photos = (Array.isArray(r.foto_urls) ? r.foto_urls : []).slice(0, 3);
    const photosHtml = photos.length
        ? `<div class="obj-photos">${photos.map((u) => `<img src="${escapeHtml(u)}" alt="">`).join("")}</div>` : "";

    const fasilitas = r.fasilitas ? String(r.fasilitas).split(",").map((s) => s.trim()).filter(Boolean) : [];

    const gridItems = [
        r.dusun ? ["Dusun", r.dusun] : null,
        r.kondisi_jalan ? ["Kondisi Jalan", r.kondisi_jalan] : null,
        r.akses_kendaraan ? ["Akses Kendaraan", r.akses_kendaraan] : null,
        r.jarak_kecamatan ? ["Jarak dari Kecamatan", r.jarak_kecamatan] : null,
        r.jam_operasional ? ["Jam Operasional", r.jam_operasional] : null,
        r.tiket_masuk ? ["Tiket Masuk", r.tiket_masuk] : null,
        r.pengelola ? ["Pengelola", r.pengelola] : null,
        r.kontak_pengelola ? ["Kontak Pengelola", r.kontak_pengelola] : null,
    ].filter(Boolean);

    const textBlocks = [
        r.potensi ? `<p><b>Potensi:</b> ${escapeHtml(r.potensi)}</p>` : "",
        r.kondisi ? `<p><b>Kondisi:</b> ${escapeHtml(r.kondisi)}</p>` : "",
        r.permasalahan ? `<p><b>Permasalahan:</b> ${escapeHtml(r.permasalahan)}</p>` : "",
        r.keunikan ? `<p><b>Keunikan:</b> ${escapeHtml(r.keunikan)}</p>` : "",
        r.kendala_utama ? `<p><b>Kendala Pengembangan:</b> ${escapeHtml(r.kendala_utama)}</p>` : "",
        r.rencana_pengembangan ? `<p><b>Rencana Pengembangan:</b> ${escapeHtml(r.rencana_pengembangan)}</p>` : "",
    ].join("");

    return `
    <article class="obj-card">
        <div class="obj-card__head">
            <div>
                <p class="obj-card__title">${escapeHtml(r.nama_objek || "(tanpa nama)")}</p>
                <p class="obj-card__loc">${escapeHtml(r.desa || "-")}${r.dusun ? " &middot; Dusun " + escapeHtml(r.dusun) : ""} &middot; Surveyor: ${escapeHtml(r.nama_surveyor || "-")}</p>
            </div>
            <span class="obj-badge">${escapeHtml(r.kategori || "-")}</span>
        </div>
        ${photosHtml}
        ${gridItems.length ? `<dl class="obj-grid">${gridItems.map(([l, v]) => `<div><dt>${escapeHtml(l)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</dl>` : ""}
        ${fasilitas.length ? `<div class="obj-chips">${fasilitas.map((f) => `<span>${escapeHtml(f)}</span>`).join("")}</div>` : ""}
        <div class="obj-text">${textBlocks}</div>
    </article>`;
}

function kop() {
    return `
    <div class="sheet__kop">
        <div class="sheet__kop-left">
            <img src="../shared/img/logo-korcam.png" alt="">
            <div><b>Laporan Potensi Kecamatan Kedewan</b><span>KKM IKIP PGRI Bojonegoro</span></div>
        </div>
        <div class="sheet__kop-right">Dicetak ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
    </div>`;
}

function foot() {
    return `<div class="sheet__foot"><span>Portal KKM Kedewan &middot; Dokumen Internal</span><span>Survey Potensi Desa</span></div>`;
}

/* ---------------------------------------------------------------------------
   Helpers
--------------------------------------------------------------------------- */
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", initLogin);