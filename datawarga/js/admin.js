// ================= ELEMEN ================
const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const logoutBtn = document.getElementById("logout-btn");
const roleTag = document.getElementById("role-tag");

const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const loginMessage = document.getElementById("login-message");

const filterSearch = document.getElementById("filter-search");
const filterDesa = document.getElementById("filter-desa");
const filterKelompok = document.getElementById("filter-kelompok");
const filterStatus = document.getElementById("filter-status");
const filterDesil = document.getElementById("filter-desil");
const filterResetBtn = document.getElementById("filter-reset-btn");
const exportBtn = document.getElementById("export-btn");

const tableBody = document.getElementById("data-table-body");
const tableEmpty = document.getElementById("table-empty");
const desaSummaryBody = document.getElementById("desa-summary-body");

const modal = document.getElementById("detail-modal");
const modalContent = document.getElementById("modal-content");
const modalCloseBtn = document.getElementById("modal-close-btn");
const btnVerifikasi = document.getElementById("btn-verifikasi");
const btnTolak = document.getElementById("btn-tolak");
const btnHapus = document.getElementById("btn-hapus");

// ---- Verifikasi massal (BARU) ----
const selectAllCheckbox = document.getElementById("select-all-checkbox");
const bulkBar = document.getElementById("bulk-bar");
const bulkCount = document.getElementById("bulk-count");
const bulkVerifikasiBtn = document.getElementById("bulk-verifikasi-btn");
const bulkTolakBtn = document.getElementById("bulk-tolak-btn");
const bulkClearBtn = document.getElementById("bulk-clear-btn");
let selectedIds = new Set();

let currentRows = [];
let filteredRows = [];
let activeRowId = null;
let daftarDesa = [];
let daftarKelompok = [];
let profilAdmin = null;


// ================= LABEL DESIL =================

function labelDesil(value) {
  if (!value || value === "tidak_terdaftar") {
    return "Tidak Terdaftar";
  }

  return `Desil ${value}`;
}


const labelStatus = {
  menunggu: "Menunggu",
  terverifikasi: "Terverifikasi",
  ditolak: "Ditolak",
};


// ================= CEK SESI =================

async function init() {
  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {
      console.error("Gagal membaca sesi:", error);
      showLogin();
      return;
    }

    if (data.session) {
      await muatProfilAdmin();

      if (profilAdmin) {
        await showDashboard();
      } else {
        await supabaseClient.auth.signOut();

        showLogin(
          "Akun ini belum terdaftar sebagai admin. Hubungi Korcam."
        );
      }
    } else {
      showLogin();
    }

  } catch (error) {
    console.error("Error init:", error);
    showLogin("Terjadi kesalahan saat memuat halaman.");
  }
}


// ================= LOGIN VIEW =================

function showLogin(pesan = "") {
  loginView.hidden = false;
  dashboardView.hidden = true;
  logoutBtn.hidden = true;
  roleTag.hidden = true;

  if (pesan) {
    loginMessage.textContent = pesan;
    loginMessage.className = "form-message error";
    loginMessage.hidden = false;
  } else {
    loginMessage.hidden = true;
  }
}


// ================= DASHBOARD =================

async function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  logoutBtn.hidden = false;

  roleTag.hidden = false;

  roleTag.textContent =
    profilAdmin.role === "korcam"
      ? "Korcam"
      : "Kordes";

  const summaryCard =
    document.getElementById("desa-summary-card");

  if (summaryCard) {
    summaryCard.hidden =
      profilAdmin.role !== "korcam";
  }

  const desaField =
    filterDesa.closest(".field");

  if (desaField) {
    desaField.hidden =
      profilAdmin.role !== "korcam";
  }

  await muatDesaDanKelompok();
  await loadData();
}


// ================= PROFIL ADMIN =================

async function muatProfilAdmin() {
  try {
    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError || !userData?.user) {
      profilAdmin = null;
      return;
    }

    const { data, error } =
      await supabaseClient
        .from(TABLE_ADMIN_PROFIL)
        .select("nama, role, desa_id")
        .eq("id", userData.user.id)
        .single();

    if (error) {
      console.error(
        "Gagal memuat profil admin:",
        error
      );

      profilAdmin = null;
      return;
    }

    profilAdmin = data;

  } catch (error) {
    console.error(
      "Error profil admin:",
      error
    );

    profilAdmin = null;
  }
}


// ================= LOGIN =================

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  loginMessage.hidden = true;

  loginBtn.disabled = true;
  loginBtn.textContent = "Memproses...";

  const email =
    document
      .getElementById("login-email")
      .value
      .trim();

  const password =
    document.getElementById(
      "login-password"
    ).value;

  try {
    const { error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      loginMessage.textContent =
        "Email atau password salah.";

      loginMessage.className =
        "form-message error";

      loginMessage.hidden = false;

      return;
    }

    await muatProfilAdmin();

    if (!profilAdmin) {
      await supabaseClient.auth.signOut();

      showLogin(
        "Akun ini belum terdaftar sebagai admin."
      );

      return;
    }

    await showDashboard();

  } catch (error) {
    console.error("Login error:", error);

    loginMessage.textContent =
      "Terjadi kesalahan saat login.";

    loginMessage.className =
      "form-message error";

    loginMessage.hidden = false;

  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Masuk";
  }
});


// ================= LOGOUT =================

logoutBtn.addEventListener(
  "click",
  async () => {
    await supabaseClient.auth.signOut();

    profilAdmin = null;
    currentRows = [];
    filteredRows = [];
    activeRowId = null;

    showLogin();
  }
);


// ================= DESA & KELOMPOK =================

async function muatDesaDanKelompok() {
  try {
    const [
      { data: desaList, error: desaError },
      {
        data: kelompokList,
        error: kelompokError,
      },
    ] = await Promise.all([
      supabaseClient
        .from(TABLE_DESA)
        .select("id, nama, urutan")
        .order("urutan"),

      supabaseClient
        .from(TABLE_KELOMPOK)
        .select("id, nomor, desa_id")
        .order("nomor"),
    ]);

    if (desaError) {
      console.error(
        "Gagal memuat desa:",
        desaError
      );
    }

    if (kelompokError) {
      console.error(
        "Gagal memuat kelompok:",
        kelompokError
      );
    }

    daftarDesa = desaList || [];
    daftarKelompok = kelompokList || [];

    const desaUntukFilter =
      profilAdmin.role === "korcam"
        ? daftarDesa
        : daftarDesa.filter(
          (d) =>
            Number(d.id) ===
            Number(profilAdmin.desa_id)
        );

    filterDesa.innerHTML =
      '<option value="">Semua Desa</option>' +
      desaUntukFilter
        .map(
          (d) =>
            `<option value="${d.id}">
              ${d.nama}
            </option>`
        )
        .join("");

    refreshFilterKelompokOptions();

  } catch (error) {
    console.error(
      "Error memuat desa/kelompok:",
      error
    );
  }
}


function refreshFilterKelompokOptions() {
  const desaId =
    filterDesa.value
      ? Number(filterDesa.value)
      : null;

  const list =
    desaId
      ? daftarKelompok.filter(
        (k) =>
          Number(k.desa_id) === desaId
      )
      : daftarKelompok;

  filterKelompok.innerHTML =
    '<option value="">Semua Kelompok</option>' +
    list
      .map(
        (k) =>
          `<option value="${k.id}">
            Kelompok ${String(k.nomor).padStart(2, "0")}
          </option>`
      )
      .join("");
}


filterDesa.addEventListener(
  "change",
  () => {
    refreshFilterKelompokOptions();
    applyFiltersAndRender();
  }
);


function namaDesa(id) {
  const d =
    daftarDesa.find(
      (x) =>
        Number(x.id) === Number(id)
    );

  return d ? d.nama : "-";
}


function labelKelompok(id) {
  const k =
    daftarKelompok.find(
      (x) =>
        Number(x.id) === Number(id)
    );

  return k
    ? `Kelompok ${String(k.nomor).padStart(2, "0")}`
    : "-";
}


// ================= LOAD DATA SURVEY =================

async function loadData() {
  try {
    const {
      data,
      error,
    } = await supabaseClient
      .from(TABLE_SURVEY)
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Gagal memuat data survey:",
        error
      );

      tableBody.innerHTML = "";

      tableEmpty.hidden = false;

      tableEmpty.textContent =
        `Gagal memuat data: ${error.message}`;

      return;
    }

    currentRows =
      profilAdmin.role === "korcam"
        ? data || []
        : (data || []).filter(
          (r) =>
            Number(r.desa_id) ===
            Number(profilAdmin.desa_id)
        );

    selectedIds.clear();
    renderStats(currentRows);
    renderDesaSummary(currentRows);
    applyFiltersAndRender();

  } catch (error) {
    console.error(
      "Error loadData:",
      error
    );

    tableEmpty.hidden = false;
    tableEmpty.textContent =
      "Terjadi kesalahan saat memuat data.";
  }
}


// ================= STATISTIK =================

function renderStats(rows) {
  document.getElementById(
    "stat-total"
  ).textContent = rows.length;

  document.getElementById(
    "stat-menunggu"
  ).textContent =
    rows.filter(
      (r) =>
        r.status_verifikasi ===
        "menunggu"
    ).length;

  document.getElementById(
    "stat-anak-tidak-sekolah"
  ).textContent =
    rows.filter(
      (r) => r.anak_tidak_sekolah
    ).length;

  document.getElementById(
    "stat-anak-ingin-kuliah"
  ).textContent =
    rows.filter(
      (r) => r.anak_ingin_kuliah
    ).length;

  document.getElementById(
    "stat-lantai-tanah"
  ).textContent =
    rows.filter(
      (r) => r.rumah_lantai_tanah
    ).length;

  document.getElementById(
    "stat-listrik"
  ).textContent =
    rows.filter(
      (r) => r.belum_ada_listrik
    ).length;
}


// ================= REKAP DESA =================

function renderDesaSummary(rows) {
  if (profilAdmin.role !== "korcam") {
    return;
  }

  desaSummaryBody.innerHTML =
    daftarDesa
      .map((d) => {
        const rowsDesaIni =
          rows.filter(
            (r) =>
              Number(r.desa_id) ===
              Number(d.id)
          );

        const kelompokAktif =
          new Set(
            rowsDesaIni.map(
              (r) => r.kelompok_id
            )
          ).size;

        const menunggu =
          rowsDesaIni.filter(
            (r) =>
              r.status_verifikasi ===
              "menunggu"
          ).length;

        const terverifikasi =
          rowsDesaIni.filter(
            (r) =>
              r.status_verifikasi ===
              "terverifikasi"
          ).length;

        return `
          <tr>
            <td>${d.nama}</td>
            <td class="num">
              ${rowsDesaIni.length}
            </td>
            <td class="num">
              ${kelompokAktif}
            </td>
            <td class="num">
              ${menunggu}
            </td>
            <td class="num">
              ${terverifikasi}
            </td>
          </tr>
        `;
      })
      .join("");
}


// ================= FILTER =================

function applyFiltersAndRender() {
  const search =
    filterSearch.value
      .trim()
      .toLowerCase();

  const desaId =
    filterDesa.value
      ? Number(filterDesa.value)
      : null;

  const kelompokId =
    filterKelompok.value
      ? Number(filterKelompok.value)
      : null;

  const status =
    filterStatus.value;

  const desil =
    filterDesil.value;

  const filtered =
    currentRows.filter((row) => {

      const matchSearch =
        !search ||
        (row.nama_kepala_keluarga || "")
          .toLowerCase()
          .includes(search) ||

        String(row.nik || "")
          .toLowerCase()
          .includes(search) ||

        String(row.nomor_kk || "")
          .toLowerCase()
          .includes(search) ||

        (row.pekerjaan || "")
          .toLowerCase()
          .includes(search);

      const matchDesa =
        !desaId ||
        Number(row.desa_id) === desaId;

      const matchKelompok =
        !kelompokId ||
        Number(row.kelompok_id) ===
        kelompokId;

      const matchStatus =
        !status ||
        row.status_verifikasi ===
        status;

      const matchDesil =
        !desil ||
        row.status_desil ===
        desil;

      return (
        matchSearch &&
        matchDesa &&
        matchKelompok &&
        matchStatus &&
        matchDesil
      );
    });

  filteredRows = filtered;

  selectedIds.clear();
  renderTable(filtered);
}


[
  filterSearch,
  filterKelompok,
  filterStatus,
  filterDesil,
].forEach((el) => {
  el.addEventListener(
    "input",
    applyFiltersAndRender
  );

  el.addEventListener(
    "change",
    applyFiltersAndRender
  );
});


filterResetBtn.addEventListener(
  "click",
  () => {
    filterSearch.value = "";
    filterDesa.value = "";
    filterKelompok.value = "";
    filterStatus.value = "";
    filterDesil.value = "";

    refreshFilterKelompokOptions();
    applyFiltersAndRender();
  }
);


// ================= RENDER TABEL =================

function statusBadge(status) {
  return `
    <span class="status-pill status-${status}">
      ${labelStatus[status] || status}
    </span>
  `;
}


function renderTable(rows) {
  tableBody.innerHTML = "";
  selectAllCheckbox.checked = false;
  selectAllCheckbox.indeterminate = false;
  updateBulkBar();

  if (rows.length === 0) {
    tableEmpty.hidden = false;

    tableEmpty.textContent =
      "Belum ada data yang cocok dengan filter ini.";

    return;
  }

  tableEmpty.hidden = true;

  rows.forEach((row) => {
    const tr =
      document.createElement("tr");

    const tanggal =
      row.created_at
        ? new Date(
          row.created_at
        ).toLocaleDateString(
          "id-ID",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        )
        : "-";

    tr.innerHTML = `
      <td class="col-check">
        <input type="checkbox" class="row-check" data-id="${row.id}">
      </td>

      <td>
        <span class="badge badge-desa">
          ${namaDesa(row.desa_id)}
        </span>
      </td>

      <td>
        <span class="badge badge-kelompok">
          ${labelKelompok(row.kelompok_id)}
        </span>
      </td>

      <td>
        ${row.nama_kepala_keluarga || "-"}
      </td>

      <td>
        ${row.nomor_kk || "-"}
      </td>

      <td>
        ${row.nik || "-"}
      </td>

      <td>
        ${row.rt || "-"}/${row.rw || "-"}
      </td>

      <td>
        ${labelDesil(row.status_desil)}
      </td>

      <td>
        ${statusBadge(row.status_verifikasi)}
      </td>

      <td>
        ${tanggal}
      </td>

      <td class="row-actions">

        <button
          type="button"
          class="btn-link"
          data-id="${row.id}"
        >
          Detail
        </button>

        <button
          type="button"
          class="btn-link-danger"
          data-id="${row.id}"
        >
          Hapus
        </button>

      </td>
    `;

    tableBody.appendChild(tr);
  });


  tableBody
    .querySelectorAll(".btn-link")
    .forEach((btn) => {

      btn.addEventListener(
        "click",
        () =>
          openDetail(
            btn.dataset.id
          )
      );
    });


  tableBody
    .querySelectorAll(".btn-link-danger")
    .forEach((btn) => {

      btn.addEventListener(
        "click",
        () => {

          const row =
            currentRows.find(
              (r) =>
                String(r.id) ===
                String(btn.dataset.id)
            );

          const nama =
            row
              ? row.nama_kepala_keluarga ||
              "data ini"
              : "data ini";

          if (
            confirm(
              `Hapus data "${nama}"? Tindakan ini tidak bisa dibatalkan.`
            )
          ) {
            deleteRow(
              btn.dataset.id
            );
          }
        }
      );
    });

  tableBody
    .querySelectorAll(".row-check")
    .forEach((cb) => {
      cb.addEventListener("change", () => {
        toggleRowSelection(cb.dataset.id, cb.checked);
      });
    });
}


// ================= VERIFIKASI MASSAL (BARU) =================

function toggleRowSelection(id, checked) {
  if (checked) {
    selectedIds.add(String(id));
  } else {
    selectedIds.delete(String(id));
  }

  const tr = tableBody.querySelector(`.row-check[data-id="${id}"]`)?.closest("tr");
  if (tr) tr.classList.toggle("row-selected", checked);

  const visibleIds = Array.from(tableBody.querySelectorAll(".row-check")).map((el) => el.dataset.id);
  const selectedVisible = visibleIds.filter((vid) => selectedIds.has(vid));
  selectAllCheckbox.checked = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  selectAllCheckbox.indeterminate = selectedVisible.length > 0 && selectedVisible.length < visibleIds.length;

  updateBulkBar();
}

function updateBulkBar() {
  const n = selectedIds.size;
  bulkCount.textContent = n;
  bulkBar.hidden = n === 0;
}

selectAllCheckbox.addEventListener("change", () => {
  const checked = selectAllCheckbox.checked;
  selectAllCheckbox.indeterminate = false;

  tableBody.querySelectorAll(".row-check").forEach((cb) => {
    cb.checked = checked;
    cb.closest("tr")?.classList.toggle("row-selected", checked);

    if (checked) {
      selectedIds.add(cb.dataset.id);
    } else {
      selectedIds.delete(cb.dataset.id);
    }
  });

  updateBulkBar();
});

bulkClearBtn.addEventListener("click", () => {
  selectedIds.clear();
  selectAllCheckbox.checked = false;
  selectAllCheckbox.indeterminate = false;
  tableBody.querySelectorAll(".row-check").forEach((cb) => {
    cb.checked = false;
    cb.closest("tr")?.classList.remove("row-selected");
  });
  updateBulkBar();
});

async function bulkUpdateStatus(newStatus) {
  const ids = Array.from(selectedIds);
  if (ids.length === 0) return;

  const label = newStatus === "terverifikasi" ? "memverifikasi" : "menolak";
  if (!confirm(`Yakin ${label} ${ids.length} data terpilih sekaligus?`)) return;

  const btn = newStatus === "terverifikasi" ? bulkVerifikasiBtn : bulkTolakBtn;
  const otherBtn = newStatus === "terverifikasi" ? bulkTolakBtn : bulkVerifikasiBtn;
  const oldText = btn.textContent;

  btn.disabled = true;
  otherBtn.disabled = true;
  bulkClearBtn.disabled = true;
  btn.textContent = "Memproses...";

  try {
    const { error } = await supabaseClient
      .from(TABLE_SURVEY)
      .update({ status_verifikasi: newStatus })
      .in("id", ids);

    if (error) {
      console.error("Gagal verifikasi massal:", error);
      alert(`Gagal memproses ${ids.length} data: ${error.message}`);
      return;
    }

    selectedIds.clear();
    await loadData();
  } catch (error) {
    console.error("Error verifikasi massal:", error);
    alert(`Terjadi kesalahan: ${error.message || error}`);
  } finally {
    btn.disabled = false;
    otherBtn.disabled = false;
    bulkClearBtn.disabled = false;
    btn.textContent = oldText;
  }
}

bulkVerifikasiBtn.addEventListener("click", () => bulkUpdateStatus("terverifikasi"));
bulkTolakBtn.addEventListener("click", () => bulkUpdateStatus("ditolak"));


// ================= DOWNLOAD FOTO =================

async function downloadSignedFile(
  url,
  filename
) {
  try {
    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const blob =
      await response.blob();

    const objectUrl =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = objectUrl;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(
        objectUrl
      );
    }, 1000);

  } catch (err) {
    console.error(
      "Gagal mengunduh foto:",
      err
    );

    alert(
      "Gagal mengunduh foto. Coba lagi."
    );
  }
}


// ================= SIGNED URL =================

async function getSignedUrl(path) {
  if (!path) {
    return null;
  }

  try {
    const {
      data,
      error,
    } =
      await supabaseClient
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(
          path,
          60 * 10
        );

    if (error) {
      console.error(
        "Gagal membuat signed URL:",
        error
      );

      return null;
    }

    return (
      data?.signedUrl ||
      null
    );

  } catch (error) {
    console.error(
      "Gagal mengakses Storage:",
      error
    );

    return null;
  }
}


// ================= MODAL DETAIL =================

async function openDetail(id) {

  // dataset dari HTML selalu string.
  const row =
    currentRows.find(
      (r) =>
        String(r.id) ===
        String(id)
    );

  if (!row) {
    console.error(
      "Data rumah tangga tidak ditemukan:",
      id
    );

    return;
  }


  // Simpan ID asli database.
  activeRowId = row.id;


  const isDesil1to5 =
    ["1", "2", "3", "4", "5"]
      .includes(
        String(row.status_desil)
      );


  const namaAnakList =
    Array.isArray(
      row.nama_anak_tidak_sekolah
    ) &&
      row.nama_anak_tidak_sekolah.length
      ? row.nama_anak_tidak_sekolah.join(
        ", "
      )
      : "-";


  // =========================================================
  // TAMPILKAN DATA TERLEBIH DAHULU
  // =========================================================

  modalContent.innerHTML = `

    <div class="full">
      <dt>Desa / Kelompok</dt>

      <dd>
        ${namaDesa(row.desa_id)}
        &mdash;
        ${labelKelompok(row.kelompok_id)}
      </dd>
    </div>


    <div>
      <dt>Nama Kepala Keluarga</dt>

      <dd>
        ${row.nama_kepala_keluarga || "-"}
      </dd>
    </div>


    <div>
      <dt>Nomor KK</dt>

      <dd>
        ${row.nomor_kk || "-"}
      </dd>
    </div>


    <div>
      <dt>NIK</dt>

      <dd>
        ${row.nik || "-"}
      </dd>
    </div>


    <div>
      <dt>Pekerjaan</dt>

      <dd>
        ${row.pekerjaan || "-"}
      </dd>
    </div>


    <div class="full">
      <dt>Alamat</dt>

      <dd>
        ${row.alamat || "-"},
        RT ${row.rt || "-"}
        /RW ${row.rw || "-"}
      </dd>
    </div>


    <div>
      <dt>Status Desil</dt>

      <dd>
        ${labelDesil(row.status_desil)}
      </dd>
    </div>


    ${isDesil1to5
      ? `
          <div>
            <dt>Anak Ingin Kuliah</dt>

            <dd>
              ${row.anak_ingin_kuliah
        ? "Ya"
        : "Tidak"
      }
            </dd>
          </div>
        `
      : "<div></div>"
    }


    <div>
      <dt>Rumah Lantai Tanah</dt>

      <dd>
        ${row.rumah_lantai_tanah
      ? "Ya"
      : "Tidak"
    }
      </dd>
    </div>


    <div>
      <dt>Belum Ada Listrik</dt>

      <dd>
        ${row.belum_ada_listrik
      ? "Ya"
      : "Tidak"
    }
      </dd>
    </div>


    <div class="full">
      <dt>Anak Tidak Sekolah</dt>

      <dd>
        ${row.anak_tidak_sekolah
      ? `Ya &mdash; ${namaAnakList}`
      : "Tidak"
    }
      </dd>
    </div>


    <div class="full modal-photos">

      <span class="hint-text">
        Memeriksa foto...
      </span>

    </div>

  `;


  // =========================================================
  // MODAL DIBUKA SEKARANG
  // =========================================================

  modal.hidden = false;


  // =========================================================
  // FOTO DIPROSES SETELAH MODAL TERBUKA
  // =========================================================

  try {

    const [
      urlKK,
      urlRumah,
    ] =
      await Promise.all([
        getSignedUrl(
          row.foto_kk_url
        ),

        getSignedUrl(
          row.foto_rumah_url
        ),
      ]);


    // Jika modal sudah ditutup
    // ketika foto selesai dimuat,
    // jangan ubah modal lagi.

    if (
      String(activeRowId) !==
      String(row.id) ||
      modal.hidden
    ) {
      return;
    }


    const photoContainer =
      modalContent.querySelector(
        ".modal-photos"
      );


    if (!photoContainer) {
      return;
    }


    photoContainer.innerHTML = "";


    // ================= FOTO KK =================

    if (urlKK) {

      const btnKK =
        document.createElement(
          "button"
        );

      btnKK.type = "button";

      btnKK.className =
        "btn-download";

      btnKK.textContent =
        "Unduh Foto KK";


      btnKK.addEventListener(
        "click",
        () => {

          downloadSignedFile(
            urlKK,

            `foto-kk-${row.nomor_kk ||
            "data"
            }.jpg`
          );

        }
      );


      photoContainer.appendChild(
        btnKK
      );
    }


    // ================= FOTO RUMAH =================

    if (urlRumah) {

      const btnRumah =
        document.createElement(
          "button"
        );

      btnRumah.type = "button";

      btnRumah.className =
        "btn-download";

      btnRumah.textContent =
        "Unduh Foto Rumah";


      btnRumah.addEventListener(
        "click",
        () => {

          downloadSignedFile(
            urlRumah,

            `foto-rumah-${row.nomor_kk ||
            "data"
            }.jpg`
          );

        }
      );


      photoContainer.appendChild(
        btnRumah
      );
    }


    // ================= TIDAK ADA FOTO =================

    if (
      !urlKK &&
      !urlRumah
    ) {

      photoContainer.innerHTML =
        `
          <span class="hint-text">
            Tidak ada foto yang tersedia.
          </span>
        `;
    }


  } catch (error) {

    console.error(
      "Gagal memuat foto:",
      error
    );


    const photoContainer =
      modalContent.querySelector(
        ".modal-photos"
      );


    if (photoContainer) {

      photoContainer.innerHTML =
        `
          <span class="hint-text">
            Foto tidak dapat dimuat.
          </span>
        `;
    }
  }
}


// ================= TUTUP MODAL =================

function closeDetailModal() {

  modal.hidden = true;

  activeRowId = null;
}


modalCloseBtn.addEventListener(
  "click",
  (e) => {

    e.preventDefault();
    e.stopPropagation();

    closeDetailModal();
  }
);


modal.addEventListener(
  "click",
  (e) => {

    if (
      e.target === modal
    ) {
      closeDetailModal();
    }
  }
);


// ================= VERIFIKASI / TOLAK =================

async function updateStatus(
  newStatus
) {

  if (!activeRowId) {

    alert(
      "Data belum dipilih."
    );

    return;
  }


  const id =
    activeRowId;


  const oldVerifikasiText =
    btnVerifikasi.textContent;

  const oldTolakText =
    btnTolak.textContent;


  // Kunci semua tombol
  btnVerifikasi.disabled = true;
  btnTolak.disabled = true;
  btnHapus.disabled = true;


  if (
    newStatus ===
    "terverifikasi"
  ) {

    btnVerifikasi.textContent =
      "Memproses...";

  } else {

    btnTolak.textContent =
      "Memproses...";
  }


  try {

    const {
      error,
    } =
      await supabaseClient
        .from(TABLE_SURVEY)
        .update({
          status_verifikasi:
            newStatus,
        })
        .eq(
          "id",
          id
        );


    if (error) {

      console.error(
        "Gagal mengubah status:",
        error
      );

      alert(
        `Gagal mengubah status: ${error.message}`
      );

      return;
    }


    modal.hidden = true;

    activeRowId = null;


    await loadData();


  } catch (error) {

    console.error(
      "Error update status:",
      error
    );

    alert(
      `Terjadi kesalahan: ${error.message ||
      error
      }`
    );


  } finally {

    btnVerifikasi.disabled =
      false;

    btnTolak.disabled =
      false;

    btnHapus.disabled =
      false;


    btnVerifikasi.textContent =
      oldVerifikasiText;

    btnTolak.textContent =
      oldTolakText;
  }
}


btnVerifikasi.addEventListener(
  "click",
  () => {
    updateStatus(
      "terverifikasi"
    );
  }
);


btnTolak.addEventListener(
  "click",
  () => {
    updateStatus(
      "ditolak"
    );
  }
);


// ================= HAPUS DATA =================

async function deleteRow(id) {

  const row =
    currentRows.find(
      (r) =>
        String(r.id) ===
        String(id)
    );


  try {

    // ================= HAPUS FOTO =================

    const paths =
      [
        row?.foto_kk_url,
        row?.foto_rumah_url,
      ].filter(Boolean);


    if (paths.length) {

      const {
        error: storageError,
      } =
        await supabaseClient
          .storage
          .from(BUCKET_NAME)
          .remove(paths);


      if (storageError) {

        console.warn(
          "Gagal menghapus sebagian foto:",
          storageError
        );
      }
    }


    // ================= HAPUS DATA DATABASE =================

    const {
      error,
    } =
      await supabaseClient
        .from(TABLE_SURVEY)
        .delete()
        .eq(
          "id",
          id
        );


    if (error) {

      alert(
        `Gagal menghapus data: ${error.message}`
      );

      return;
    }


    if (
      String(activeRowId) ===
      String(id)
    ) {

      modal.hidden = true;

      activeRowId = null;
    }


    await loadData();


  } catch (error) {

    console.error(
      "Error deleteRow:",
      error
    );

    alert(
      `Terjadi kesalahan saat menghapus data: ${error.message ||
      error
      }`
    );
  }
}


btnHapus.addEventListener(
  "click",
  async () => {

    if (!activeRowId) {
      return;
    }


    const row =
      currentRows.find(
        (r) =>
          String(r.id) ===
          String(activeRowId)
      );


    const nama =
      row
        ? row.nama_kepala_keluarga ||
        "data ini"
        : "data ini";


    if (
      confirm(
        `Hapus data "${nama}"? Tindakan ini tidak bisa dibatalkan.`
      )
    ) {

      btnHapus.disabled = true;

      btnHapus.textContent =
        "Menghapus...";


      try {

        await deleteRow(
          activeRowId
        );

      } finally {

        btnHapus.disabled =
          false;

        btnHapus.textContent =
          "Hapus Data";
      }
    }
  }
);


// ================= EKSPOR EXCEL =================

exportBtn.addEventListener(
  "click",
  async () => {

    const rows =
      filteredRows.length
        ? filteredRows
        : currentRows;


    if (
      rows.length === 0
    ) {

      alert(
        "Tidak ada data untuk diekspor."
      );

      return;
    }


    exportBtn.disabled = true;

    exportBtn.textContent =
      "Menyiapkan file...";


    try {

      const workbook =
        new ExcelJS.Workbook();


      workbook.creator =
        "KKM IKIP PGRI Bojonegoro - Kecamatan Kedewan";

      workbook.created =
        new Date();


      const sheet =
        workbook.addWorksheet(
          "Data Rumah Warga",
          {
            views: [
              {
                state: "frozen",
                ySplit: 3,
              },
            ],

            pageSetup: {
              orientation:
                "landscape",

              fitToPage:
                true,

              fitToWidth:
                1,

              fitToHeight:
                0,

              margins: {
                left: 0.3,
                right: 0.3,
                top: 0.5,
                bottom: 0.5,
                header: 0.2,
                footer: 0.2,
              },
            },
          }
        );


      const columns = [

        {
          header: "No",
          key: "no",
          width: 5,
        },

        {
          header: "Desa",
          key: "desa",
          width: 16,
        },

        {
          header: "Kelompok",
          key: "kelompok",
          width: 12,
        },

        {
          header:
            "Nama Kepala Keluarga",
          key: "nama",
          width: 24,
        },

        {
          header: "Nomor KK",
          key: "kk",
          width: 18,
        },

        {
          header: "NIK",
          key: "nik",
          width: 18,
        },

        {
          header: "Pekerjaan",
          key: "pekerjaan",
          width: 18,
        },

        {
          header: "Alamat",
          key: "alamat",
          width: 22,
        },

        {
          header: "RT",
          key: "rt",
          width: 6,
        },

        {
          header: "RW",
          key: "rw",
          width: 6,
        },

        {
          header: "Status Desil",
          key: "desil",
          width: 14,
        },

        {
          header:
            "Anak Ingin Kuliah",
          key: "ingin_kuliah",
          width: 16,
        },

        {
          header:
            "Rumah Lantai Tanah",
          key: "lantai",
          width: 16,
        },

        {
          header:
            "Belum Ada Listrik",
          key: "listrik",
          width: 16,
        },

        {
          header:
            "Anak Tidak Sekolah",
          key: "tidak_sekolah",
          width: 16,
        },

        {
          header:
            "Nama Anak Tidak Sekolah",
          key: "nama_anak",
          width: 26,
        },

        {
          header:
            "Status Verifikasi",
          key: "status",
          width: 16,
        },

        {
          header:
            "Tanggal Masuk",
          key: "tanggal",
          width: 15,
        },

      ];


      // ================= JUDUL =================

      sheet.mergeCells(
        1,
        1,
        1,
        columns.length
      );


      const titleCell =
        sheet.getCell(
          1,
          1
        );


      titleCell.value =
        "DATA RUMAH WARGA — PROGRAM KERJA KKM SE-KECAMATAN KEDEWAN";


      titleCell.font = {
        bold: true,
        size: 14,
        color: {
          argb: "FF1E293B",
        },
      };


      titleCell.alignment = {
        horizontal:
          "center",

        vertical:
          "middle",
      };


      sheet.getRow(
        1
      ).height = 26;


      // ================= SUBTITLE =================

      sheet.mergeCells(
        2,
        1,
        2,
        columns.length
      );


      const subtitleCell =
        sheet.getCell(
          2,
          1
        );


      subtitleCell.value =
        `Diekspor pada ${new Date().toLocaleDateString(
          "id-ID",
          {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }
        )} — Total data: ${rows.length}`;


      subtitleCell.font = {
        italic: true,
        size: 10,
        color: {
          argb: "FF6B7280",
        },
      };


      subtitleCell.alignment = {
        horizontal:
          "center",
      };


      sheet.getRow(
        2
      ).height = 18;


      // ================= HEADER =================

      sheet.columns =
        columns;


      const headerRow =
        sheet.getRow(3);


      headerRow.values =
        columns.map(
          (c) => c.header
        );


      headerRow.height = 22;


      headerRow.eachCell(
        (cell) => {

          cell.font = {
            bold: true,
            color: {
              argb: "FFFFFFFF",
            },
            size: 11,
          };


          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "FF2563EB",
            },
          };


          cell.alignment = {
            horizontal:
              "center",

            vertical:
              "middle",

            wrapText:
              true,
          };


          cell.border = {

            top: {
              style: "thin",
              color: {
                argb: "FF1D4ED8",
              },
            },

            bottom: {
              style: "thin",
              color: {
                argb: "FF1D4ED8",
              },
            },

            left: {
              style: "thin",
              color: {
                argb: "FF1D4ED8",
              },
            },

            right: {
              style: "thin",
              color: {
                argb: "FF1D4ED8",
              },
            },

          };

        }
      );


      // ================= DATA =================

      rows.forEach(
        (row, index) => {

          const tanggal =
            row.created_at
              ? new Date(
                row.created_at
              ).toLocaleDateString(
                "id-ID",
                {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }
              )
              : "-";


          const isDesil1to5 =
            [
              "1",
              "2",
              "3",
              "4",
              "5",
            ].includes(
              String(
                row.status_desil
              )
            );


          const dataRow =
            sheet.addRow({

              no:
                index + 1,

              desa:
                namaDesa(
                  row.desa_id
                ),

              kelompok:
                labelKelompok(
                  row.kelompok_id
                ),

              nama:
                row.nama_kepala_keluarga ||
                "-",

              kk:
                row.nomor_kk ||
                "-",

              nik:
                row.nik ||
                "-",

              pekerjaan:
                row.pekerjaan ||
                "-",

              alamat:
                row.alamat ||
                "-",

              rt:
                row.rt ||
                "-",

              rw:
                row.rw ||
                "-",

              desil:
                labelDesil(
                  row.status_desil
                ),

              ingin_kuliah:
                isDesil1to5
                  ? row.anak_ingin_kuliah
                    ? "Ya"
                    : "Tidak"
                  : "-",

              lantai:
                row.rumah_lantai_tanah
                  ? "Ya"
                  : "Tidak",

              listrik:
                row.belum_ada_listrik
                  ? "Ya"
                  : "Tidak",

              tidak_sekolah:
                row.anak_tidak_sekolah
                  ? "Ya"
                  : "Tidak",

              nama_anak:
                Array.isArray(
                  row.nama_anak_tidak_sekolah
                ) &&
                  row
                    .nama_anak_tidak_sekolah
                    .length
                  ? row
                    .nama_anak_tidak_sekolah
                    .join(", ")
                  : "-",

              status:
                labelStatus[
                row.status_verifikasi
                ] ||
                row.status_verifikasi ||
                "-",

              tanggal,

            });


          const isEvenRow =
            index % 2 === 0;


          dataRow.eachCell(
            (cell) => {

              cell.font = {
                size: 10.5,
              };


              cell.alignment = {
                vertical:
                  "middle",

                wrapText:
                  false,
              };


              cell.border = {

                top: {
                  style: "thin",
                  color: {
                    argb:
                      "FFE5E7EB",
                  },
                },

                bottom: {
                  style: "thin",
                  color: {
                    argb:
                      "FFE5E7EB",
                  },
                },

                left: {
                  style: "thin",
                  color: {
                    argb:
                      "FFE5E7EB",
                  },
                },

                right: {
                  style: "thin",
                  color: {
                    argb:
                      "FFE5E7EB",
                  },
                },

              };


              if (
                isEvenRow
              ) {

                cell.fill = {
                  type:
                    "pattern",

                  pattern:
                    "solid",

                  fgColor: {
                    argb:
                      "FFF8FAFC",
                  },
                };

              }

            }
          );

        }
      );


      // ================= FILTER EXCEL =================

      sheet.autoFilter = {
        from: {
          row: 3,
          column: 1,
        },

        to: {
          row: 3,
          column:
            columns.length,
        },
      };


      // ================= DOWNLOAD EXCEL =================

      const buffer =
        await workbook.xlsx.writeBuffer();


      const blob =
        new Blob(
          [buffer],
          {
            type:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        );


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          "a"
        );


      link.href = url;


      link.download =
        `data-rumah-warga-kedewan-${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`;


      document.body.appendChild(
        link
      );

      link.click();

      link.remove();


      setTimeout(() => {
        URL.revokeObjectURL(
          url
        );
      }, 1000);


    } catch (err) {

      console.error(
        "Error export Excel:",
        err
      );

      alert(
        `Gagal membuat file Excel: ${err.message ||
        err
        }`
      );


    } finally {

      exportBtn.disabled =
        false;

      exportBtn.textContent =
        "Ekspor Excel";
    }
  }
);


// ================= MULAI =================

init();