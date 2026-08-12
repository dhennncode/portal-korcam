// ==========================================================
// STATE
// ==========================================================
let STATE = {
  kelompok: [],
  prokerMaster: [],
  loading: true,
  currentStep: 0,
  totalSteps: 4,
};

const STEP_LABELS = ["Kelompok", "Proker", "Pendataan", "Kirim"];

// ==========================================================
// LOAD DATA (read-only, form still works even if this is slow)
// ==========================================================
async function loadData() {
  try {
    const data = await apiGet();
    STATE.kelompok = data.kelompok || [];
    STATE.prokerMaster = data.prokerMaster || [];
    hideError();
  } catch (err) {
    showError(err.message);
  } finally {
    STATE.loading = false;
    renderFormDesaOptions();
    renderDesaChips();
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

function getProkerForKelompok(desa, kelompok) {
  return STATE.prokerMaster.filter(
    (p) => p.desa === desa && p.nama_koordinator === kelompok
  );
}

// ==========================================================
// RENDER: STRUKTUR TAB
// ==========================================================
const PHOTO_KEY_PREFIX = "korcam_foto__";

function safeGetPhoto(nama) {
  try { return localStorage.getItem(PHOTO_KEY_PREFIX + nama); } catch (e) { return null; }
}
function safeSetPhoto(nama, dataUrl) {
  try { localStorage.setItem(PHOTO_KEY_PREFIX + nama, dataUrl); } catch (e) { /* storage tidak tersedia, lewati */ }
}

function renderStruktur() {
  const grid = document.getElementById("struktur-grid");
  grid.innerHTML = CONFIG.TIM_KORCAM.map((p, idx) => {
    const initials = p.nama.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
    const saved = safeGetPhoto(p.nama);
    return `
      <div class="person-card">
        <div class="person-photo-wrap">
          <img class="person-photo" id="photo-img-${idx}" src="${saved || ""}" style="${saved ? "" : "display:none"}" alt="Foto ${escapeHtml(p.nama)}" />
          <div class="person-monogram" id="photo-fallback-${idx}" style="${saved ? "display:none" : ""}">${initials}</div>
        </div>
        <div class="person-role">${escapeHtml(p.peran)}</div>
        <div class="person-name">${escapeHtml(p.nama)}</div>
        ${p.catatan ? `<div class="person-note">${escapeHtml(p.catatan)}</div>` : ""}
        <div>
          <label class="photo-upload-btn" for="photo-input-${idx}">${saved ? "Ganti Foto" : "Unggah Foto"}</label>
          <input type="file" id="photo-input-${idx}" accept="image/*" hidden data-nama="${escapeHtml(p.nama)}" />
        </div>
      </div>`;
  }).join("");

  grid.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        safeSetPhoto(input.dataset.nama, reader.result);
        renderStruktur();
      };
      reader.readAsDataURL(file);
    });
  });
}

function renderDesaChips() {
  const el = document.getElementById("desa-chip-list");
  if (!el) return;
  el.innerHTML = getDesaList().map((d) => `<span class="chip">${escapeHtml(d)}</span>`).join("");
}

// ==========================================================
// RENDER: FORM DROPDOWNS
// ==========================================================
function renderFormDesaOptions() {
  const sel = document.getElementById("input-desa");
  const current = sel.value;
  const list = getDesaList();
  sel.innerHTML = list.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
  if (current && list.includes(current)) sel.value = current;
  renderFormKelompokOptions();
}

function renderFormKelompokOptions() {
  const desa = document.getElementById("input-desa").value;
  const sel = document.getElementById("input-kelompok");
  const list = getKelompokForDesa(desa);
  if (list.length) {
    sel.innerHTML = list
      .map((k) => `<option value="${escapeHtml(k.nama_koordinator)}">${escapeHtml(k.nama_koordinator)}</option>`)
      .join("");
  } else {
    sel.innerHTML = `<option value="">Belum ada data koordinator untuk desa ini</option>`;
  }
}

function renderProkerStep() {
  const desa = document.getElementById("input-desa").value;
  const kelompok = document.getElementById("input-kelompok").value;
  const list = getProkerForKelompok(desa, kelompok);
  const wrap = document.getElementById("proker-list");
  const empty = document.getElementById("proker-empty");

  if (!list.length) {
    wrap.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  wrap.innerHTML = list
    .map(
      (p, i) => `
    <div class="proker-row">
      <div class="proker-name">${escapeHtml(p.nama_proker)}</div>
      <div class="range-row">
        <input type="range" class="proker-slider" data-nama="${escapeHtml(p.nama_proker)}" min="0" max="100" step="5" value="0" />
        <span class="range-value">0%</span>
      </div>
    </div>`
    )
    .join("");

  wrap.querySelectorAll(".proker-slider").forEach((slider) => {
    slider.addEventListener("input", () => {
      slider.nextElementSibling.textContent = slider.value + "%";
    });
  });
}

// ==========================================================
// STEPPER NAV
// ==========================================================
function renderStepperNav() {
  const nav = document.getElementById("stepper-nav");
  nav.innerHTML = STEP_LABELS.map((label, i) => {
    const cls = i === STATE.currentStep ? "active" : i < STATE.currentStep ? "done" : "";
    const letter = String.fromCharCode(65 + i);
    const connector = i < STEP_LABELS.length - 1 ? `<div class="step-connector"></div>` : "";
    return `<div class="step-node ${cls}">
        <div class="step-circle">${i < STATE.currentStep ? "&#10003;" : letter}</div>
        <div class="step-label">${label}</div>
      </div>${connector}`;
  }).join("");
}

function goToStep(n) {
  if (n === 1) renderProkerStep();
  if (n === 3) renderReview();
  STATE.currentStep = n;
  document.querySelectorAll(".step-panel").forEach((p) => {
    p.classList.toggle("active", Number(p.dataset.step) === n);
  });
  renderStepperNav();
  document.getElementById("btn-prev").style.visibility = n === 0 ? "hidden" : "visible";
  document.getElementById("btn-next").style.display = n === STATE.totalSteps - 1 ? "none" : "inline-block";
  document.getElementById("submit-btn").style.display = n === STATE.totalSteps - 1 ? "inline-block" : "none";
}

function validateStep(n) {
  if (n === 0) {
    const minggu = document.getElementById("input-minggu").value;
    const kelompok = document.getElementById("input-kelompok").value;
    if (!minggu) { showToastOn("toast", "Isi minggu ke- dulu", true); return false; }
    if (!kelompok) { showToastOn("toast", "Pilih koordinator / kelompok dulu", true); return false; }
  }
  return true;
}

function renderReview() {
  const minggu = document.getElementById("input-minggu").value;
  const desa = document.getElementById("input-desa").value;
  const kelompok = document.getElementById("input-kelompok").value;
  const pendataan = document.getElementById("input-progres-pendataan").value;
  const kendala = document.getElementById("input-kendala").value;
  const bantuan = document.getElementById("input-bantuan").value;
  const prokerRows = Array.from(document.querySelectorAll(".proker-slider")).map(
    (s) => `<div class="proker-mini"><span class="nm">${escapeHtml(s.dataset.nama)}</span>
      <div class="progress-bar"><div class="progress-fill" style="width:${s.value}%"></div></div>
      <span class="progress-label">${s.value}%</span></div>`
  ).join("") || `<span class="muted">Tidak ada proker terdaftar.</span>`;

  document.getElementById("review-box").innerHTML = `
    <p><b>Minggu ${escapeHtml(minggu)}</b> — ${escapeHtml(desa)} / ${escapeHtml(kelompok)}</p>
    <div class="proker-mini-list" style="margin:10px 0;">${prokerRows}</div>
    <p>Progres pendataan: <b>${pendataan}%</b></p>
    <p>Kendala: ${kendala ? escapeHtml(kendala) : "<i>Tidak ada</i>"}</p>
    <p>Butuh bantuan Korcam: <b>${bantuan}</b></p>
  `;
}

// ==========================================================
// FORM SUBMIT
// ==========================================================
function initForm() {
  const range2 = document.getElementById("input-progres-pendataan");
  const rangeOut2 = document.getElementById("progres-pendataan-value");
  range2.addEventListener("input", () => (rangeOut2.textContent = range2.value + "%"));

  document.getElementById("input-desa").addEventListener("change", renderFormKelompokOptions);

  document.getElementById("btn-next").addEventListener("click", () => {
    if (!validateStep(STATE.currentStep)) return;
    goToStep(Math.min(STATE.currentStep + 1, STATE.totalSteps - 1));
  });
  document.getElementById("btn-prev").addEventListener("click", () => {
    goToStep(Math.max(STATE.currentStep - 1, 0));
  });

  document.getElementById("laporan-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("submit-btn");

    const prokerItems = Array.from(document.querySelectorAll(".proker-slider")).map((s) => ({
      nama: s.dataset.nama,
      persen: Number(s.value),
    }));

    const payload = {
      minggu: document.getElementById("input-minggu").value,
      desa: document.getElementById("input-desa").value,
      kelompok: document.getElementById("input-kelompok").value,
      prokerItems: prokerItems,
      progresPendataan: Number(document.getElementById("input-progres-pendataan").value),
      kendala: document.getElementById("input-kendala").value,
      butuhBantuan: document.getElementById("input-bantuan").value,
      status: "Baru",
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Mengirim...";
    try {
      await apiPostLaporan(payload);
      showToastOn("toast", "Laporan berhasil dikirim");
      e.target.reset();
      document.getElementById("progres-pendataan-value").textContent = "0%";
      goToStep(0);
    } catch (err) {
      showToastOn("toast", err.message, true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Kirim Laporan";
    }
  });
}

// ==========================================================
// DRAWER: STRUKTUR KORCAM
// ==========================================================
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
  renderKop({
    eyebrow: "Koordinator Kecamatan Kedewan",
    headlineTitle: "Monitoring Proker &amp; Kendala",
    tagline: "Kartu Laporan Mingguan — Kelompok KKM Kecamatan Kedewan",
    showStrukturLink: true,
  });
  initForm();
  goToStep(0);
  loadData();
});
