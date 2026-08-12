// ==========================================================
// STATE
// ==========================================================
let STATE = {
  kelompok: [],
  prokerMaster: [],
  laporan: [],
  loading: true,
  filterMinggu: "Semua",
  filterDesa: "Semua",
};

const SESSION_KEY = "korcam_admin_session";

// ==========================================================
// LOGIN GATE
// ==========================================================
function initLogin() {
  const already = sessionStorage.getItem(SESSION_KEY);
  if (already === "1") {
    enterAdmin();
    return;
  }
  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const nim = document.getElementById("login-nim").value.trim();
    const sandi = document.getElementById("login-sandi").value.trim();
    if (nim === CONFIG.ADMIN_NIM && sandi === CONFIG.ADMIN_SANDI) {
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
  initAdminShell();
}

function initAdminShell() {
  renderKop({
    eyebrow: "Koordinator Kecamatan Kedewan",
    headlineTitle: "Panel Korcam",
    tagline: "Khusus internal — dashboard monitoring &amp; kelola proker kelompok",
  });
  document.getElementById("logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });
  initTabs();
  initFilters();
  initProkerForm();
  loadData();
}

// ==========================================================
// LOAD DATA
// ==========================================================
async function loadData() {
  STATE.loading = true;
  renderAll();
  try {
    const data = await apiGet();
    STATE.kelompok = data.kelompok || [];
    STATE.prokerMaster = data.prokerMaster || [];
    STATE.laporan = (data.laporan || []).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    hideError();
  } catch (err) {
    showError(err.message);
  } finally {
    STATE.loading = false;
    renderAll();
  }
}

function getDesaList() {
  if (STATE.kelompok.length) {
    return [...new Set(STATE.kelompok.map((k) => k.desa).filter(Boolean))];
  }
  return CONFIG.DESA_LIST;
}

function getKelompokForDesa(desa) {
  return STATE.kelompok.filter((k) => k.desa === desa);
}

// ==========================================================
// GROUP FLAT "LAPORAN" ROWS (ONE PER PROKER) INTO SUBMISSIONS
// ==========================================================
function groupSubmissions(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const key = [r.created_at, r.desa, r.nama_koordinator, r.minggu].join("|");
    if (!map.has(key)) {
      map.set(key, {
        Timestamp: r.created_at,
        Minggu: r.minggu,
        Desa: r.desa,
        Kelompok: r.nama_koordinator,
        Kendala: r.kendala,
        ButuhBantuan: r.butuh_bantuan,
        Status: r.status,
        ProgresPendataan: r.progres_pendataan,
        proker: [],
      });
    }
    map.get(key).proker.push({
      nama: r.nama_proker || "-",
      persen: Number(r.progres_proker) || 0,
    });
  });
  return [...map.values()];
}

function filteredSubmissions() {
  const subs = groupSubmissions(STATE.laporan);
  return subs.filter((s) => {
    if (STATE.filterMinggu !== "Semua" && String(s.Minggu) !== STATE.filterMinggu) return false;
    if (STATE.filterDesa !== "Semua" && s.Desa !== STATE.filterDesa) return false;
    return true;
  });
}

function getMingguList() {
  const set = new Set(STATE.laporan.map((l) => String(l.minggu)).filter(Boolean));
  return [...set].sort((a, b) => Number(a) - Number(b));
}

function belumLaporMingguIni() {
  const mingguTerbaru = getMingguList().slice(-1)[0];
  if (!mingguTerbaru) return STATE.kelompok;
  const sudahLapor = new Set(
    STATE.laporan
      .filter((l) => String(l.minggu) === mingguTerbaru)
      .map((l) => l.desa + "|" + l.nama_koordinator)
  );
  return STATE.kelompok.filter((k) => !sudahLapor.has(k.desa + "|" + k.nama_koordinator));
}

// ==========================================================
// RENDER: DASHBOARD
// ==========================================================
function renderAll() {
  renderStats();
  renderFilters();
  renderTable();
  renderBelumLapor();
  renderProkerDesaOptions();
  renderProkerMasterList();
}

function renderStats() {
  const subs = groupSubmissions(STATE.laporan);
  const kendalaTerbuka = subs.filter((s) => s.Status && s.Status !== "Selesai").length;
  const butuhBantuan = subs.filter((s) => s.ButuhBantuan === "Ya").length;
  const allProker = STATE.laporan;
  const avgProker = allProker.length
    ? Math.round(
        allProker.reduce((sum, l) => sum + (Number(l.progres_proker) || 0), 0) / allProker.length
      )
    : 0;

  document.getElementById("stat-total").textContent = subs.length;
  document.getElementById("stat-kendala").textContent = kendalaTerbuka;
  document.getElementById("stat-bantuan").textContent = butuhBantuan;
  document.getElementById("stat-progres").textContent = avgProker + "%";
}

function renderFilters() {
  const mingguSel = document.getElementById("filter-minggu");
  const desaSel = document.getElementById("filter-desa");
  const mingguList = getMingguList();
  const desaList = getDesaList();

  mingguSel.innerHTML =
    `<option value="Semua">Semua Minggu</option>` +
    mingguList.map((m) => `<option value="${m}">Minggu ${m}</option>`).join("");
  mingguSel.value = STATE.filterMinggu;

  desaSel.innerHTML =
    `<option value="Semua">Semua Desa</option>` +
    desaList.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
  desaSel.value = STATE.filterDesa;
}

function statusBadgeClass(status) {
  if (status === "Selesai") return "badge badge-ok";
  if (status === "Diproses") return "badge badge-progress";
  return "badge badge-new";
}

function renderTable() {
  const tbody = document.getElementById("laporan-tbody");
  const empty = document.getElementById("laporan-empty");
  const loadingEl = document.getElementById("laporan-loading");
  const rows = filteredSubmissions();

  loadingEl.style.display = STATE.loading ? "block" : "none";
  if (STATE.loading) {
    tbody.innerHTML = "";
    empty.style.display = "none";
    return;
  }

  if (!rows.length) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  tbody.innerHTML = rows
    .map((s) => {
      const prokerMini = s.proker
        .map(
          (p) => `<div class="proker-mini"><span class="nm">${escapeHtml(p.nama)}</span>
        <div class="progress-bar"><div class="progress-fill" style="width:${p.persen}%"></div></div>
        <span class="progress-label">${p.persen}%</span></div>`
        )
        .join("");
      return `
    <tr>
      <td>${s.Minggu ?? "-"}</td>
      <td>${escapeHtml(s.Desa)}</td>
      <td>${escapeHtml(s.Kelompok)}</td>
      <td><div class="proker-mini-list">${prokerMini || "<span class='muted'>-</span>"}</div></td>
      <td>
        <div class="progress-bar"><div class="progress-fill alt" style="width:${s.ProgresPendataan || 0}%"></div></div>
        <span class="progress-label">${s.ProgresPendataan || 0}%</span>
      </td>
      <td class="col-kendala">${s.Kendala ? escapeHtml(s.Kendala) : "-"}</td>
      <td>${s.ButuhBantuan === "Ya" ? '<span class="badge badge-warn">Ya</span>' : "Tidak"}</td>
      <td><span class="${statusBadgeClass(s.Status)}">${s.Status || "Baru"}</span></td>
    </tr>`;
    })
    .join("");
}

function renderBelumLapor() {
  const el = document.getElementById("belum-lapor-list");
  if (STATE.loading) {
    el.innerHTML = "";
    return;
  }
  const list = belumLaporMingguIni();
  if (!list.length) {
    el.innerHTML = `<p class="muted">Semua kelompok sudah lapor minggu terbaru, atau belum ada data kelompok di tabel proker_kelompok.</p>`;
    return;
  }
  el.innerHTML = list
    .map((k) => `<span class="chip">${escapeHtml(k.desa)} — ${escapeHtml(k.nama_koordinator || "?")}</span>`)
    .join("");
}

// ==========================================================
// RENDER: KELOLA PROKER
// ==========================================================
function renderProkerDesaOptions() {
  const sel = document.getElementById("proker-desa");
  if (!sel) return;
  const current = sel.value;
  const list = getDesaList();
  sel.innerHTML = list.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
  if (current && list.includes(current)) sel.value = current;
  renderProkerKelompokOptions();
}

function renderProkerKelompokOptions() {
  const desa = document.getElementById("proker-desa").value;
  const sel = document.getElementById("proker-kelompok");
  const list = getKelompokForDesa(desa);
  sel.innerHTML = list.length
    ? list.map((k) => `<option value="${escapeHtml(k.nama_koordinator)}">${escapeHtml(k.nama_koordinator)}</option>`).join("")
    : `<option value="">Belum ada koordinator untuk desa ini</option>`;
}

function renderProkerMasterList() {
  const el = document.getElementById("proker-master-list");
  if (!el) return;
  if (STATE.loading) { el.innerHTML = ""; return; }
  if (!STATE.prokerMaster.length) {
    el.innerHTML = `<p class="muted">Belum ada proker terdaftar.</p>`;
    return;
  }
  const byKelompok = new Map();
  STATE.prokerMaster.forEach((p) => {
    const key = p.desa + " — " + p.nama_koordinator;
    if (!byKelompok.has(key)) byKelompok.set(key, []);
    byKelompok.get(key).push(p.nama_proker);
  });
  el.innerHTML = [...byKelompok.entries()]
    .map(
      ([key, prokerNames]) => `
      <div class="proker-row">
        <div class="proker-name">${escapeHtml(key)}</div>
        <div class="muted">${prokerNames.map(escapeHtml).join(" · ")}</div>
      </div>`
    )
    .join("");
}

function initProkerForm() {
  document.getElementById("proker-desa").addEventListener("change", renderProkerKelompokOptions);
  document.getElementById("proker-submit-btn").addEventListener("click", async () => {
    const desa = document.getElementById("proker-desa").value;
    const kelompok = document.getElementById("proker-kelompok").value;
    const nama = document.getElementById("proker-nama").value.trim();
    if (!desa || !kelompok) {
      showToastOn("toast", "Belum ada data koordinator untuk desa ini di tabel proker_kelompok", true);
      return;
    }
    if (!nama) {
      showToastOn("toast", "Isi nama proker dulu", true);
      return;
    }
    const btn = document.getElementById("proker-submit-btn");
    btn.disabled = true;
    btn.textContent = "Menyimpan...";
    try {
      await apiPostProker({ desa, kelompok, namaProker: nama });
      showToastOn("toast", "Proker berhasil ditambahkan");
      document.getElementById("proker-nama").value = "";
      await loadData();
    } catch (err) {
      showToastOn("toast", err.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = "+ Tambah Proker";
    }
  });
}

// ==========================================================
// TABS / FILTERS
// ==========================================================
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
    });
  });
}

function initFilters() {
  document.getElementById("filter-minggu").addEventListener("change", (e) => {
    STATE.filterMinggu = e.target.value;
    renderTable();
  });
  document.getElementById("filter-desa").addEventListener("change", (e) => {
    STATE.filterDesa = e.target.value;
    renderTable();
  });
  document.getElementById("refresh-btn").addEventListener("click", loadData);
}

function showError(msg) {
  const box = document.getElementById("error-box");
  box.textContent = "\u26A0 " + msg;
  box.style.display = "block";
}
function hideError() {
  document.getElementById("error-box").style.display = "none";
}

// ==========================================================
// INIT
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  initLogin();
});
