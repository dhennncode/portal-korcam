/* ==========================================================================
   LAPORAN PDF — Data Rumah Warga Kecamatan Kedewan
   --------------------------------------------------------------------------
   File ini SENGAJA berdiri sendiri (tidak menyentuh admin.js/script.js yang
   sudah ada) supaya aman ditambahkan begitu saja ke folder datawarga/.
   Kredensial Supabase & nama tabel dipakai bersama dari js/config.js
   (SUPABASE_URL, SUPABASE_ANON_KEY, TABLE_SURVEY, TABLE_DESA, TABLE_KELOMPOK,
   TABLE_ADMIN_PROFIL, supabaseClient) — jangan didefinisikan ulang di sini.
   Sesi login memakai Supabase Auth yang sama dengan admin.html.
   ========================================================================== */

const DESIL_LIST = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

const labelStatusLaporan = {
    menunggu: "Menunggu",
    terverifikasi: "Terverifikasi",
    ditolak: "Ditolak",
};

function labelDesilLaporan(value) {
    if (!value || value === "tidak_terdaftar") return "Tidak Terdaftar";
    return `Desil ${value}`;
}

const STATE = {
    rows: [],
    daftarDesa: [],
    daftarKelompok: [],
    profilAdmin: null,
    filterDesa: "",
    filterStatus: "",
    fotoRumahMap: {}, // path storage -> signed URL (BARU)
};

/* ---------------------------------------------------------------------------
   Gerbang otentikasi — memakai sesi Supabase Auth yang sama dengan admin.html
--------------------------------------------------------------------------- */
async function initAuth() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error || !data.session) {
            showNeedLogin();
            return;
        }

        const { data: userData, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !userData?.user) {
            showNeedLogin();
            return;
        }

        const { data: profil, error: profilError } = await supabaseClient
            .from(TABLE_ADMIN_PROFIL)
            .select("nama, role, desa_id")
            .eq("id", userData.user.id)
            .single();

        if (profilError || !profil) {
            showNeedLogin();
            return;
        }

        STATE.profilAdmin = profil;
        await enterLaporan();
    } catch (err) {
        console.error("Error initAuth:", err);
        showNeedLogin();
    }
}

function showNeedLogin() {
    document.getElementById("gate-shell").style.display = "flex";
    document.getElementById("laporan-shell").style.display = "none";
}

async function enterLaporan() {
    document.getElementById("gate-shell").style.display = "none";
    document.getElementById("laporan-shell").style.display = "block";

    document.getElementById("role-badge").textContent =
        STATE.profilAdmin.role === "korcam" ? "Korcam" : "Kordes";

    document.getElementById("print-btn").addEventListener("click", () => window.print());

    await muatDesaDanKelompok();
    initFilters();
    await loadData();
}

/* ---------------------------------------------------------------------------
   Desa & Kelompok
--------------------------------------------------------------------------- */
async function muatDesaDanKelompok() {
    try {
        const [{ data: desaList, error: desaError }, { data: kelompokList, error: kelompokError }] =
            await Promise.all([
                supabaseClient.from(TABLE_DESA).select("id, nama, urutan").order("urutan"),
                supabaseClient.from(TABLE_KELOMPOK).select("id, nomor, desa_id").order("nomor"),
            ]);

        if (desaError) console.error("Gagal memuat desa:", desaError);
        if (kelompokError) console.error("Gagal memuat kelompok:", kelompokError);

        STATE.daftarDesa = desaList || [];
        STATE.daftarKelompok = kelompokList || [];
    } catch (err) {
        console.error("Error muat desa/kelompok:", err);
    }
}

function namaDesaLaporan(id) {
    const d = STATE.daftarDesa.find((x) => Number(x.id) === Number(id));
    return d ? d.nama : "-";
}

function labelKelompokLaporan(id) {
    const k = STATE.daftarKelompok.find((x) => Number(x.id) === Number(id));
    return k ? `Kelompok ${String(k.nomor).padStart(2, "0")}` : "-";
}

/* ---------------------------------------------------------------------------
   Filter toolbar
--------------------------------------------------------------------------- */
function initFilters() {
    const desaUntukFilter =
        STATE.profilAdmin.role === "korcam"
            ? STATE.daftarDesa
            : STATE.daftarDesa.filter((d) => Number(d.id) === Number(STATE.profilAdmin.desa_id));

    const desaSel = document.getElementById("filter-desa");
    desaSel.innerHTML =
        `<option value="">Semua Desa</option>` +
        desaUntukFilter.map((d) => `<option value="${d.id}">${escapeHtml(d.nama)}</option>`).join("");
    desaSel.addEventListener("change", (e) => { STATE.filterDesa = e.target.value; render(); });

    // Non-korcam (Kordes) hanya bertanggung jawab atas 1 desa — sembunyikan filter desa.
    if (STATE.profilAdmin.role !== "korcam") {
        desaSel.closest(".field").hidden = true;
        STATE.filterDesa = String(STATE.profilAdmin.desa_id);
    }

    const statusSel = document.getElementById("filter-status");
    statusSel.addEventListener("change", (e) => { STATE.filterStatus = e.target.value; render(); });
}

/* ---------------------------------------------------------------------------
   Load data
--------------------------------------------------------------------------- */
async function loadData() {
    const statusEl = document.getElementById("load-status");
    try {
        const { data, error } = await supabaseClient
            .from(TABLE_SURVEY)
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);

        STATE.rows =
            STATE.profilAdmin.role === "korcam"
                ? data || []
                : (data || []).filter((r) => Number(r.desa_id) === Number(STATE.profilAdmin.desa_id));

        statusEl.textContent = `${STATE.rows.length} data dimuat. Memuat foto rumah\u2026`;
        await muatFotoRumah();
        statusEl.textContent = `${STATE.rows.length} data dimuat.`;
    } catch (err) {
        statusEl.textContent = "Gagal memuat data: " + err.message;
    }
    render();
}

/* ---------------------------------------------------------------------------
   Foto rumah (BARU) — bucket Storage bersifat privat, jadi tiap path foto
   perlu ditukar jadi signed URL sebelum bisa ditampilkan sebagai <img>.
   Dilakukan satu kali secara batch (bukan per-baris) supaya cepat.
--------------------------------------------------------------------------- */
async function muatFotoRumah() {
    const paths = [...new Set(STATE.rows.map((r) => r.foto_rumah_url).filter(Boolean))];
    if (!paths.length) return;

    try {
        const { data, error } = await supabaseClient
            .storage
            .from(BUCKET_NAME)
            .createSignedUrls(paths, 60 * 30); // berlaku 30 menit, cukup utk lihat & cetak

        if (error) {
            console.error("Gagal membuat signed URL foto rumah:", error);
            return;
        }

        (data || []).forEach((item) => {
            if (item.signedUrl && !item.error) {
                STATE.fotoRumahMap[item.path] = item.signedUrl;
            }
        });
    } catch (err) {
        console.error("Error memuat foto rumah:", err);
    }
}

function filteredRowsLaporan() {
    return STATE.rows.filter((r) => {
        if (STATE.filterDesa && Number(r.desa_id) !== Number(STATE.filterDesa)) return false;
        if (STATE.filterStatus && r.status_verifikasi !== STATE.filterStatus) return false;
        return true;
    });
}

/* ---------------------------------------------------------------------------
   Render laporan
--------------------------------------------------------------------------- */
function render() {
    const root = document.getElementById("report-root");
    const emptyEl = document.getElementById("empty-state");
    const rows = filteredRowsLaporan();

    if (!rows.length) {
        root.classList.remove("ready");
        root.innerHTML = "";
        emptyEl.style.display = "block";
        return;
    }
    emptyEl.style.display = "none";
    root.classList.add("ready");

    const tanggal = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const desaSet = [...new Set(rows.map((r) => r.desa_id).filter((v) => v !== null && v !== undefined))];
    const cakupan = STATE.filterDesa ? `Desa ${namaDesaLaporan(STATE.filterDesa)}` : "Seluruh Kecamatan Kedewan";

    root.innerHTML = coverPage(rows, tanggal, cakupan) + ringkasanPage(rows, desaSet) + desaPages(rows);
}

function coverPage(rows, tanggal, cakupan) {
    return `
    <section class="sheet cover">
        <div class="cover__text">
            <img class="cover__logo" src="../shared/img/logo-korcam.png" alt="Logo Korcam KKM IKIP PGRI Bojonegoro">
            <p class="cover__eyebrow">KKM &middot; IKIP PGRI Bojonegoro &middot; Koordinator Kecamatan</p>
            <h1 class="cover__title">Laporan Data Rumah Warga<br>Kecamatan Kedewan</h1>
            <p class="cover__sub">Rekapitulasi hasil pendataan kondisi rumah tangga warga sebagai basis Program Kerja KKM di seluruh desa Kecamatan Kedewan, Kabupaten Bojonegoro.</p>
            <div class="cover__rule"></div>
            <dl class="cover__meta">
                <div><dt>Cakupan</dt><dd>${escapeHtml(cakupan)}</dd></div>
                <div><dt>Total Data</dt><dd>${rows.length}</dd></div>
                <div><dt>Tanggal Cetak</dt><dd>${tanggal}</dd></div>
            </dl>
        </div>
        <div class="cover__visual">
            <img src="assets/ilustrasi-rumah.svg" alt="Ilustrasi rumah">
        </div>
        <p class="cover__footer">Dokumen ini dihasilkan otomatis dari Portal KKM Kedewan &middot; Dokumen Internal &mdash; Bersifat Rahasia</p>
    </section>`;
}

function ringkasanPage(rows, desaSet) {
    const menunggu = rows.filter((r) => r.status_verifikasi === "menunggu").length;
    const terverifikasi = rows.filter((r) => r.status_verifikasi === "terverifikasi").length;
    const ditolak = rows.filter((r) => r.status_verifikasi === "ditolak").length;
    const anakTidakSekolah = rows.filter((r) => r.anak_tidak_sekolah).length;
    const anakInginKuliah = rows.filter((r) => r.anak_ingin_kuliah).length;
    const lantaiTanah = rows.filter((r) => r.rumah_lantai_tanah).length;
    const belumListrik = rows.filter((r) => r.belum_ada_listrik).length;

    const desaCount = {};
    const desaMenunggu = {};
    const desaTerverifikasi = {};
    rows.forEach((r) => {
        const key = r.desa_id;
        desaCount[key] = (desaCount[key] || 0) + 1;
        if (r.status_verifikasi === "menunggu") desaMenunggu[key] = (desaMenunggu[key] || 0) + 1;
        if (r.status_verifikasi === "terverifikasi") desaTerverifikasi[key] = (desaTerverifikasi[key] || 0) + 1;
    });

    const desaRowsHtml = STATE.daftarDesa
        .filter((d) => desaCount[d.id])
        .map(
            (d) => `<tr>
                <td>${escapeHtml(d.nama)}</td>
                <td class="num">${desaCount[d.id] || 0}</td>
                <td class="num">${desaMenunggu[d.id] || 0}</td>
                <td class="num">${desaTerverifikasi[d.id] || 0}</td>
            </tr>`
        )
        .join("");

    const desilCount = {};
    rows.forEach((r) => {
        const key = r.status_desil || "tidak_terdaftar";
        desilCount[key] = (desilCount[key] || 0) + 1;
    });
    const desilRowsHtml = ["tidak_terdaftar", ...DESIL_LIST]
        .filter((k) => desilCount[k])
        .map((k) => `<tr><td>${labelDesilLaporan(k)}</td><td class="num">${desilCount[k]}</td></tr>`)
        .join("");

    return `
    <section class="sheet sheet--wide">
        ${kop()}
        <h2 class="section-title">Ringkasan Eksekutif</h2>
        <p class="section-desc">Gambaran umum hasil pendataan rumah tangga warga se-Kecamatan Kedewan.</p>

        <div class="stat-row">
            <div class="stat-box"><b>${rows.length}</b><span>Total Data</span></div>
            <div class="stat-box"><b>${desaSet.length}</b><span>Desa Tercakup</span></div>
            <div class="stat-box"><b>${menunggu}</b><span>Menunggu</span></div>
            <div class="stat-box"><b>${terverifikasi}</b><span>Terverifikasi</span></div>
            <div class="stat-box"><b>${ditolak}</b><span>Ditolak</span></div>
            <div class="stat-box"><b>${anakTidakSekolah}</b><span>Anak Tidak Sekolah</span></div>
            <div class="stat-box"><b>${anakInginKuliah}</b><span>Anak Ingin Kuliah</span></div>
            <div class="stat-box"><b>${lantaiTanah}</b><span>Lantai Tanah</span></div>
            <div class="stat-box"><b>${belumListrik}</b><span>Belum Ada Listrik</span></div>
        </div>

        <div class="rekap-row">
            <table class="rekap">
                <thead><tr><th>Desa</th><th class="num">Total Data</th><th class="num">Menunggu</th><th class="num">Terverifikasi</th></tr></thead>
                <tbody>
                    ${desaRowsHtml}
                    <tr><td>Total</td><td class="num">${rows.length}</td><td class="num">${menunggu}</td><td class="num">${terverifikasi}</td></tr>
                </tbody>
            </table>

            <table class="rekap">
                <thead><tr><th>Status Desil</th><th class="num">Jumlah KK</th></tr></thead>
                <tbody>${desilRowsHtml}</tbody>
            </table>
        </div>

        ${foot()}
    </section>`;
}

function desaPages(rows) {
    const order = STATE.daftarDesa.filter((d) => rows.some((r) => Number(r.desa_id) === Number(d.id)));
    return order
        .map((desa) => {
            const items = rows.filter((r) => Number(r.desa_id) === Number(desa.id));
            return `
        <section class="sheet sheet--wide">
            ${kop()}
            <div class="desa-heading">Desa ${escapeHtml(desa.nama)} <span class="count">${items.length} data rumah tangga</span></div>
            ${dataTable(items)}
            ${foot()}
        </section>`;
        })
        .join("");
}

function dataTable(items) {
    const rowsHtml = items
        .map((r, i) => {
            const indikator = [
                r.anak_tidak_sekolah ? "Anak Putus Sekolah" : "",
                r.rumah_lantai_tanah ? "Lantai Tanah" : "",
                r.belum_ada_listrik ? "Belum Listrik" : "",
            ].filter(Boolean);

            const indikatorHtml = indikator.length
                ? indikator.map((t) => `<span class="chip-flag">${escapeHtml(t)}</span>`).join("")
                : `<span class="chip-ok">Tidak ada indikator</span>`;

            const fotoUrl = r.foto_rumah_url ? STATE.fotoRumahMap[r.foto_rumah_url] : null;
            const fotoCell = fotoUrl
                ? `<img class="foto-thumb" src="${escapeHtml(fotoUrl)}" alt="Foto rumah ${escapeHtml(r.nama_kepala_keluarga || "")}">`
                : `<div class="foto-none" title="Belum ada foto rumah"><img src="assets/ilustrasi-rumah.svg" alt=""></div>`;

            return `
            <tr>
                <td class="num">${i + 1}</td>
                <td class="col-foto">${fotoCell}</td>
                <td>${escapeHtml(r.nama_kepala_keluarga || "-")}</td>
                <td>${escapeHtml(labelKelompokLaporan(r.kelompok_id))}</td>
                <td class="num">${escapeHtml(r.rt || "-")}/${escapeHtml(r.rw || "-")}</td>
                <td>${escapeHtml(r.pekerjaan || "-")}</td>
                <td>${escapeHtml(r.nomor_kk || "-")}</td>
                <td>${escapeHtml(r.nik || "-")}</td>
                <td>${labelDesilLaporan(r.status_desil)}</td>
                <td>${indikatorHtml}</td>
                <td><span class="chip-status chip-status--${escapeHtml(r.status_verifikasi || "menunggu")}">${escapeHtml(labelStatusLaporan[r.status_verifikasi] || r.status_verifikasi || "-")}</span></td>
            </tr>`;
        })
        .join("");

    return `
    <table class="data-table-print">
        <thead>
            <tr>
                <th class="num">No</th>
                <th class="col-foto">Foto Rumah</th>
                <th>Nama Kepala Keluarga</th>
                <th>Kelompok</th>
                <th class="num">RT/RW</th>
                <th>Pekerjaan</th>
                <th>No. KK</th>
                <th>NIK</th>
                <th>Desil</th>
                <th>Indikator</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
    </table>`;
}

function kop() {
    return `
    <div class="sheet__kop">
        <div class="sheet__kop-left">
            <img class="kop-logo" src="../shared/img/logo-korcam.png" alt="">
            <img class="kop-rumah" src="assets/ilustrasi-rumah.svg" alt="">
            <div><b>Laporan Data Rumah Warga Kedewan</b><span>KKM IKIP PGRI Bojonegoro</span></div>
        </div>
        <div class="sheet__kop-right">Dicetak ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
    </div>`;
}

function foot() {
    return `<div class="sheet__foot"><span>Portal KKM Kedewan &middot; Dokumen Internal</span><span>Data Rumah Warga</span></div>`;
}

/* ---------------------------------------------------------------------------
   Helpers
--------------------------------------------------------------------------- */
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", initAuth);