/* ==========================================================================
   KONFIGURASI SUPABASE — SATU-SATUNYA TEMPAT YANG PERLU DIUBAH
   --------------------------------------------------------------------------
   1. Buka dashboard Supabase project kamu.
   2. Klik ikon gear "Project Settings" di sidebar kiri bawah, lalu klik "API".
   3. Salin "Project URL" -> tempel ke SUPABASE_URL di bawah ini.
   4. Salin "anon public" key (di bagian "Project API keys") -> tempel ke
      SUPABASE_ANON_KEY di bawah ini.
   5. JANGAN pernah menempel "service_role" key di sini — kunci itu hanya
      boleh dipakai di server, bukan di kode yang berjalan di browser.
   ========================================================================== */
const SUPABASE_URL = "https://opvcdgzwiriaafcodocn.supabase.co"; // <-- GANTI dengan Project URL kamu
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wdmNkZ3p3aXJpYWFmY29kb2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMDg2MDMsImV4cCI6MjEwMTc4NDYwM30.jD6E_M_-GsVrDJBAJW_mrhJDDn6np41aUouiOafSnoU"; // <-- GANTI dengan anon public key kamu

const STORAGE_BUCKET = "survey-photos";
const TABLE_NAME = "survey_data";
/* ========================================================================== */

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------------------------------------------------------------------------
   State
--------------------------------------------------------------------------- */
const TOTAL_STEPS = 7;
let currentStep = 1;

const state = {
    nama_surveyor: "",
    no_whatsapp: "",
    kelompok_kkm: "",
    desa: "",
    dusun: "",
    nama_objek: "",
    kategori: "",
    latitude: null,
    longitude: null,
    link_lokasi: "",
    potensi: "",
    kondisi: "",
    permasalahan: "",
    photos: [], // { file, previewUrl }
};

/* ---------------------------------------------------------------------------
   Element refs
--------------------------------------------------------------------------- */
const form = document.getElementById("surveyForm");
const stepperList = document.getElementById("stepperList");
const stepperFill = document.getElementById("stepperFill");
const panels = Array.from(document.querySelectorAll("[data-step-panel]"));

const dropzone = document.getElementById("dropzone");
const fotoInput = document.getElementById("fotoInput");
const photoGrid = document.getElementById("photoGrid");

const gpsBtn = document.getElementById("btnAmbilLokasi");
const gpsStatus = document.getElementById("gpsStatus");
const gpsTitle = document.getElementById("gpsTitle");
const gpsDesc = document.getElementById("gpsDesc");
const gpsCoords = document.getElementById("gpsCoords");
const latValue = document.getElementById("latValue");
const lngValue = document.getElementById("lngValue");

const summaryList = document.getElementById("summaryList");
const submitErrorBox = document.getElementById("submitError");
const submitErrorDesc = document.getElementById("submitErrorDesc");
const btnSubmit = document.getElementById("btnSubmit");

const loadingOverlay = document.getElementById("loadingOverlay");
const loadingTitle = document.getElementById("loadingTitle");
const loadingDesc = document.getElementById("loadingDesc");
const successOverlay = document.getElementById("successOverlay");
const btnEntriBaru = document.getElementById("btnEntriBaru");

/* ---------------------------------------------------------------------------
   Stepper rendering
--------------------------------------------------------------------------- */
function renderStepper() {
    const items = stepperList.querySelectorAll(".stepper__item");
    items.forEach((item) => {
        const step = Number(item.dataset.step);
        if (step < currentStep) item.dataset.state = "done";
        else if (step === currentStep) item.dataset.state = "active";
        else item.dataset.state = "todo";
    });
    stepperFill.style.width = `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%`;
}

function goToStep(step) {
    panels.forEach((panel) => {
        panel.hidden = Number(panel.dataset.stepPanel) !== step;
    });
    currentStep = step;
    renderStepper();
    if (step === TOTAL_STEPS) renderSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
        if (!validateStep(currentStep)) return;
        goToStep(Math.min(currentStep + 1, TOTAL_STEPS));
    });
});
document.querySelectorAll("[data-prev]").forEach((btn) => {
    btn.addEventListener("click", () => goToStep(Math.max(currentStep - 1, 1)));
});

/* ---------------------------------------------------------------------------
   Field error helpers
--------------------------------------------------------------------------- */
function showFieldError(fieldId, message) {
    const errEl = document.getElementById(`err-${fieldId}`);
    const fieldWrap = document.getElementById(fieldId)?.closest(".field") ||
        document.getElementById(fieldId)?.closest(".gps-box");
    if (errEl) {
        errEl.textContent = message;
        errEl.classList.add("is-visible");
    }
    if (fieldWrap) fieldWrap.classList.add("has-error");
}

function clearFieldError(fieldId) {
    const errEl = document.getElementById(`err-${fieldId}`);
    const fieldWrap = document.getElementById(fieldId)?.closest(".field") ||
        document.getElementById(fieldId)?.closest(".gps-box");
    if (errEl) {
        errEl.textContent = "";
        errEl.classList.remove("is-visible");
    }
    if (fieldWrap) fieldWrap.classList.remove("has-error");
}

function clearAllErrors() {
    document.querySelectorAll(".field__error").forEach((el) => {
        el.textContent = "";
        el.classList.remove("is-visible");
    });
    document.querySelectorAll(".has-error").forEach((el) => el.classList.remove("has-error"));
}

function scrollToFirstError() {
    const firstError = document.querySelector('[data-step-panel]:not([hidden]) .has-error, [data-step-panel]:not([hidden]) .field__error.is-visible');
    if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ---------------------------------------------------------------------------
   Validation per step
--------------------------------------------------------------------------- */
function validateStep(step) {
    clearAllErrors();
    let valid = true;

    const need = (id, value, message) => {
        if (!value || !value.toString().trim()) {
            showFieldError(id, message);
            valid = false;
        }
    };

    if (step === 1) {
        state.nama_surveyor = document.getElementById("namaSurveyor").value.trim();
        state.no_whatsapp = document.getElementById("noWhatsapp").value.trim();
        state.kelompok_kkm = document.getElementById("kelompokKkm").value.trim();

        need("namaSurveyor", state.nama_surveyor, "Nama surveyor wajib diisi.");
        if (!state.no_whatsapp) {
            showFieldError("noWhatsapp", "Nomor WhatsApp wajib diisi.");
            valid = false;
        } else if (!/^[0-9]+$/.test(state.no_whatsapp)) {
            showFieldError("noWhatsapp", "Nomor WhatsApp hanya boleh berisi angka.");
            valid = false;
        } else if (state.no_whatsapp.length < 9) {
            showFieldError("noWhatsapp", "Nomor WhatsApp terlalu pendek.");
            valid = false;
        }
        need("kelompokKkm", state.kelompok_kkm, "Kelompok KKM wajib diisi.");
    }

    if (step === 2) {
        state.desa = document.getElementById("desa").value;
        state.dusun = document.getElementById("dusun").value.trim();
        need("desa", state.desa, "Pilih desa terlebih dahulu.");
    }

    if (step === 3) {
        state.nama_objek = document.getElementById("namaObjek").value.trim();
        state.kategori = document.getElementById("kategori").value;
        need("namaObjek", state.nama_objek, "Nama objek wajib diisi.");
        need("kategori", state.kategori, "Pilih kategori terlebih dahulu.");
    }

    if (step === 4) {
        state.link_lokasi = document.getElementById("linkLokasi").value.trim();

        if (state.latitude === null || state.longitude === null) {
            showFieldError("gps", "Ambil titik lokasi GPS sebelum melanjutkan.");
            valid = false;
        }
        if (!state.link_lokasi) {
            showFieldError("linkLokasi", "Link lokasi Google Maps wajib diisi.");
            valid = false;
        } else if (!/^https?:\/\//i.test(state.link_lokasi)) {
            showFieldError("linkLokasi", "Link harus diawali dengan http:// atau https://");
            valid = false;
        }
    }

    if (step === 5) {
        state.potensi = document.getElementById("potensi").value.trim();
        state.kondisi = document.getElementById("kondisi").value.trim();
        state.permasalahan = document.getElementById("permasalahan").value.trim();
        need("potensi", state.potensi, "Deskripsi wajib diisi.");
        need("kondisi", state.kondisi, "Kondisi wajib diisi.");
    }

    if (step === 6) {
        if (state.photos.length < 1) {
            showFieldError("foto", "Unggah minimal 1 foto.");
            valid = false;
        } else if (state.photos.length > 3) {
            showFieldError("foto", "Maksimal 3 foto.");
            valid = false;
        }
    }

    if (!valid) scrollToFirstError();
    return valid;
}

function validateAllSteps() {
    for (let s = 1; s <= 6; s++) {
        if (!validateStep(s)) {
            goToStep(s);
            return false;
        }
    }
    return true;
}

/* ---------------------------------------------------------------------------
   Live-clear errors while typing
--------------------------------------------------------------------------- */
["namaSurveyor", "noWhatsapp", "kelompokKkm", "desa", "dusun", "namaObjek", "kategori", "linkLokasi", "potensi", "kondisi"]
    .forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", () => clearFieldError(id));
        if (el) el.addEventListener("change", () => clearFieldError(id));
    });

document.getElementById("noWhatsapp").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
});

/* ---------------------------------------------------------------------------
   GPS
--------------------------------------------------------------------------- */
function setGpsState(mode, title, desc) {
    gpsStatus.dataset.state = mode;
    gpsTitle.textContent = title;
    gpsDesc.textContent = desc;
}

gpsBtn.addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
        setGpsState("error", "Geolocation tidak didukung", "Browser HP kamu tidak mendukung fitur GPS. Coba pakai browser lain seperti Chrome.");
        return;
    }

    clearFieldError("gps");
    gpsBtn.disabled = true;
    setGpsState("loading", "Sedang mengambil lokasi\u2026", "Pastikan GPS/lokasi HP kamu aktif dan berada di ruang terbuka.");

    navigator.geolocation.getCurrentPosition(
        (position) => {
            state.latitude = position.coords.latitude;
            state.longitude = position.coords.longitude;
            setGpsState("success", "Lokasi berhasil diambil", `Akurasi sekitar ${Math.round(position.coords.accuracy)} meter.`);
            latValue.textContent = state.latitude.toFixed(6);
            lngValue.textContent = state.longitude.toFixed(6);
            gpsCoords.hidden = false;
            gpsBtn.disabled = false;
        },
        (error) => {
            gpsBtn.disabled = false;
            state.latitude = null;
            state.longitude = null;
            gpsCoords.hidden = true;
            if (error.code === error.PERMISSION_DENIED) {
                setGpsState("error", "Izin lokasi ditolak", "Aktifkan izin lokasi untuk browser ini di pengaturan HP kamu, lalu coba lagi.");
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                setGpsState("error", "Lokasi tidak tersedia", "Sinyal GPS tidak ditemukan. Pindah ke area terbuka lalu coba lagi.");
            } else if (error.code === error.TIMEOUT) {
                setGpsState("error", "Waktu habis", "Pengambilan lokasi terlalu lama. Periksa sinyal GPS dan coba lagi.");
            } else {
                setGpsState("error", "Gagal mengambil lokasi", "Terjadi kesalahan tak terduga. Coba lagi.");
            }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
});

/* ---------------------------------------------------------------------------
   Photo upload
--------------------------------------------------------------------------- */
const MAX_PHOTOS = 3;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

dropzone.addEventListener("click", () => fotoInput.click());
dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fotoInput.click(); }
});
["dragover", "dragenter"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("is-dragover"); })
);
["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("is-dragover"); })
);
dropzone.addEventListener("drop", (e) => {
    handleFiles(e.dataTransfer.files);
});

fotoInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
    fotoInput.value = "";
});

function handleFiles(fileList) {
    clearFieldError("foto");
    const incoming = Array.from(fileList);

    for (const file of incoming) {
        if (state.photos.length >= MAX_PHOTOS) {
            showFieldError("foto", `Maksimal ${MAX_PHOTOS} foto. File tambahan diabaikan.`);
            break;
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            showFieldError("foto", `"${file.name}" bukan format JPG/PNG dan dilewati.`);
            continue;
        }
        if (file.size > MAX_SIZE_BYTES) {
            showFieldError("foto", `"${file.name}" melebihi 5MB dan dilewati.`);
            continue;
        }
        state.photos.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    renderPhotoGrid();
}

function renderPhotoGrid() {
    photoGrid.innerHTML = "";
    state.photos.forEach((photo, index) => {
        const thumb = document.createElement("div");
        thumb.className = "photo-thumb";
        thumb.innerHTML = `
      <img src="${photo.previewUrl}" alt="Pratinjau foto ${index + 1}">
      <button type="button" class="photo-thumb__remove" aria-label="Hapus foto ${index + 1}">
        <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
      <span class="photo-thumb__size">${(photo.file.size / 1024 / 1024).toFixed(1)} MB</span>
    `;
        thumb.querySelector(".photo-thumb__remove").addEventListener("click", () => {
            URL.revokeObjectURL(photo.previewUrl);
            state.photos.splice(index, 1);
            renderPhotoGrid();
        });
        photoGrid.appendChild(thumb);
    });
}

/* ---------------------------------------------------------------------------
   Summary (step G)
--------------------------------------------------------------------------- */
function renderSummary() {
    const rows = [
        ["Surveyor", state.nama_surveyor],
        ["WhatsApp", state.no_whatsapp],
        ["Kelompok KKM", state.kelompok_kkm],
        ["Desa", state.desa],
        ["Dusun", state.dusun || "\u2014"],
        ["Nama Objek", state.nama_objek],
        ["Kategori", state.kategori],
        ["Koordinat", `${state.latitude?.toFixed(6)}, ${state.longitude?.toFixed(6)}`, "mono"],
        ["Link Lokasi", state.link_lokasi],
        ["Deskripsi", state.potensi],
        ["Kondisi", state.kondisi],
        ["Permasalahan", state.permasalahan || "\u2014"],
        ["Jumlah Foto", `${state.photos.length} foto`],
    ];

    summaryList.innerHTML = rows.map(([label, value, cls]) => `
    <div class="summary__row">
      <dt>${label}</dt>
      <dd class="${cls || ""}">${escapeHtml(String(value))}</dd>
    </div>
  `).join("");
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

/* ---------------------------------------------------------------------------
   Submit flow
--------------------------------------------------------------------------- */
function showLoading(title, desc) {
    loadingTitle.textContent = title;
    loadingDesc.textContent = desc;
    loadingOverlay.hidden = false;
}
function hideLoading() { loadingOverlay.hidden = true; }

function sanitizeForFilename(text) {
    return text
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase()
        .slice(0, 40) || "objek";
}

async function uploadPhotos() {
    const urls = [];
    for (let i = 0; i < state.photos.length; i++) {
        const { file } = state.photos[i];
        showLoading("Mengunggah foto\u2026", `Foto ${i + 1} dari ${state.photos.length}`);

        const ext = file.type === "image/png" ? "png" : "jpg";
        const fileName = `${Date.now()}_${sanitizeForFilename(state.nama_objek)}_${i + 1}.${ext}`;

        const { error: uploadError } = await supabaseClient
            .storage
            .from(STORAGE_BUCKET)
            .upload(fileName, file, { cacheControl: "3600", upsert: false, contentType: file.type });

        if (uploadError) {
            throw new Error(`Gagal mengunggah foto ke-${i + 1}: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
        urls.push(publicUrlData.publicUrl);
    }
    return urls;
}

async function insertSurveyRow(fotoUrls) {
    const payload = {
        nama_surveyor: state.nama_surveyor,
        no_whatsapp: state.no_whatsapp,
        kelompok_kkm: state.kelompok_kkm,
        desa: state.desa,
        dusun: state.dusun || null,
        nama_objek: state.nama_objek,
        kategori: state.kategori,
        latitude: state.latitude,
        longitude: state.longitude,
        link_lokasi: state.link_lokasi,
        potensi: state.potensi,
        kondisi: state.kondisi,
        permasalahan: state.permasalahan || null,
        foto_urls: fotoUrls,
    };

    const { error } = await supabaseClient.from(TABLE_NAME).insert(payload);
    if (error) throw new Error(`Gagal menyimpan data: ${error.message}`);
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitErrorBox.hidden = true;

    if (!validateAllSteps()) return;

    btnSubmit.disabled = true;
    showLoading("Menyiapkan pengiriman\u2026", "Mohon tunggu sebentar.");

    try {
        const fotoUrls = await uploadPhotos();
        showLoading("Menyimpan data\u2026", "Hampir selesai.");
        await insertSurveyRow(fotoUrls);

        hideLoading();
        successOverlay.hidden = false;
    } catch (err) {
        hideLoading();
        submitErrorBox.hidden = false;
        submitErrorDesc.textContent = err.message || "Terjadi kesalahan tak terduga. Data yang sudah kamu isi tetap tersimpan, silakan coba kirim ulang.";
        submitErrorBox.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
        btnSubmit.disabled = false;
    }
});

/* ---------------------------------------------------------------------------
   Reset for next entry
--------------------------------------------------------------------------- */
btnEntriBaru.addEventListener("click", () => {
    successOverlay.hidden = true;
    form.reset();

    state.nama_surveyor = state.no_whatsapp = state.kelompok_kkm = "";
    state.desa = state.dusun = state.nama_objek = state.kategori = "";
    state.latitude = state.longitude = null;
    state.link_lokasi = "";
    state.potensi = state.kondisi = state.permasalahan = "";
    state.photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    state.photos = [];

    renderPhotoGrid();
    setGpsState("idle", "Lokasi belum diambil", "Tekan tombol di atas saat kamu sudah berada tepat di lokasi objek.");
    gpsCoords.hidden = true;
    clearAllErrors();
    goToStep(1);
});

/* ---------------------------------------------------------------------------
   Init
--------------------------------------------------------------------------- */
renderStepper();