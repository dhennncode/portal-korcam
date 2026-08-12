// ============================================================
// SCRIPT.JS
// FORM SURVEY DATA RUMAH TANGGA
// ============================================================


// ============================================================
// ELEMEN
// ============================================================

const form = document.getElementById("survey-form");
const submitBtn = document.getElementById("submit-btn");
const formMessage = document.getElementById("form-message");

const desaSelect = document.getElementById("desa_id");
const kelompokSelect = document.getElementById("kelompok_id");

const statusDesilSelect =
  document.getElementById("status_desil");

const wrapAnakInginKuliah =
  document.getElementById("wrap-anak-ingin-kuliah");

const anakInginKuliahCheckbox =
  document.getElementById("anak_ingin_kuliah");

const wrapNamaAnak =
  document.getElementById("wrap-nama-anak");

const namaAnakTextarea =
  document.getElementById("nama_anak_tidak_sekolah");

const anakTidakSekolahRadios =
  document.querySelectorAll(
    'input[name="anak_tidak_sekolah"]'
  );


// ============================================================
// VALIDASI ELEMEN
// ============================================================

if (!form) {
  console.error("Element #survey-form tidak ditemukan.");
}

if (!desaSelect) {
  console.error("Element #desa_id tidak ditemukan.");
}

if (!kelompokSelect) {
  console.error("Element #kelompok_id tidak ditemukan.");
}


// ============================================================
// DATA KELOMPOK
// ============================================================

let daftarKelompok = [];


// ============================================================
// LOAD DESA DAN KELOMPOK
// ============================================================

async function muatDesaDanKelompok() {

  try {

    console.log("Mengambil data desa dan kelompok...");

    const [
      desaResponse,
      kelompokResponse
    ] = await Promise.all([

      supabaseClient
        .from(TABLE_DESA)
        .select("id, nama, urutan")
        .order("urutan", { ascending: true }),

      supabaseClient
        .from(TABLE_KELOMPOK)
        .select("id, nomor, desa_id")
        .order("nomor", { ascending: true })

    ]);


    const {
      data: desaList,
      error: errDesa
    } = desaResponse;

    const {
      data: kelompokList,
      error: errKelompok
    } = kelompokResponse;


    // ========================================================
    // ERROR DESA
    // ========================================================

    if (errDesa) {

      console.error(
        "ERROR DESA:",
        errDesa
      );

      desaSelect.innerHTML =
        '<option value="">Gagal memuat desa</option>';

      return;
    }


    // ========================================================
    // ERROR KELOMPOK
    // ========================================================

    if (errKelompok) {

      console.error(
        "ERROR KELOMPOK:",
        errKelompok
      );

      desaSelect.innerHTML =
        '<option value="">Gagal memuat kelompok</option>';

      return;
    }


    // ========================================================
    // SIMPAN DATA KELOMPOK
    // ========================================================

    daftarKelompok = kelompokList || [];


    // ========================================================
    // ISI DROPDOWN DESA
    // ========================================================

    desaSelect.innerHTML =
      '<option value="" selected disabled>Pilih desa</option>' +

      (desaList || [])
        .map(function (desa) {

          return `
            <option value="${desa.id}">
              ${desa.nama}
            </option>
          `;

        })
        .join("");


    console.log(
      "Desa berhasil dimuat:",
      desaList
    );

    console.log(
      "Kelompok berhasil dimuat:",
      daftarKelompok
    );

  }

  catch (error) {

    console.error(
      "Gagal mengambil data:",
      error
    );

    desaSelect.innerHTML =
      '<option value="">Gagal memuat desa</option>';
  }
}


// ============================================================
// CHANGE DESA
// ============================================================

if (desaSelect) {

  desaSelect.addEventListener(
    "change",
    function () {

      const desaId =
        Number(desaSelect.value);


      const kelompokDesaIni =
        daftarKelompok.filter(
          function (kelompok) {

            return Number(kelompok.desa_id) === desaId;

          }
        );


      console.log(
        "Kelompok untuk desa:",
        desaId,
        kelompokDesaIni
      );


      if (kelompokDesaIni.length === 0) {

        kelompokSelect.innerHTML =
          `
          <option value="" selected disabled>
            Belum ada kelompok terdaftar untuk desa ini
          </option>
          `;

        kelompokSelect.disabled = true;

        return;
      }


      kelompokSelect.innerHTML =
        `
        <option value="" selected disabled>
          Pilih kelompok
        </option>
        ` +

        kelompokDesaIni
          .map(function (kelompok) {

            return `
              <option value="${kelompok.id}">
                Kelompok ${String(kelompok.nomor).padStart(2, "0")}
              </option>
            `;

          })
          .join("");


      kelompokSelect.disabled = false;
    }
  );

}


// ============================================================
// DESIL
// ============================================================

if (statusDesilSelect) {

  statusDesilSelect.addEventListener(
    "change",
    function () {

      const desil1sampai5 =
        [
          "1",
          "2",
          "3",
          "4",
          "5"
        ].includes(
          statusDesilSelect.value
        );


      if (wrapAnakInginKuliah) {

        wrapAnakInginKuliah.hidden =
          !desil1sampai5;

      }


      if (
        !desil1sampai5 &&
        anakInginKuliahCheckbox
      ) {

        anakInginKuliahCheckbox.checked =
          false;

      }

    }
  );

}


// ============================================================
// ANAK TIDAK SEKOLAH
// ============================================================

anakTidakSekolahRadios.forEach(
  function (radio) {

    radio.addEventListener(
      "change",
      function () {

        if (!wrapNamaAnak) {
          return;
        }

        wrapNamaAnak.hidden =
          !(
            radio.checked &&
            radio.value === "ya"
          );

      }
    );

  }
);


// ============================================================
// NAMA FILE FOTO
// ============================================================

const uploadFileIds = [
  "foto_kk",
  "foto_rumah"
];


uploadFileIds.forEach(
  function (id) {

    const input =
      document.getElementById(id);

    const filenameLabel =
      document.getElementById(
        `${id}-filename`
      );


    if (!input || !filenameLabel) {
      return;
    }


    input.addEventListener(
      "change",
      function () {

        filenameLabel.textContent =
          input.files.length > 0
            ? input.files[0].name
            : "Pilih foto";

      }
    );

  }
);


// ============================================================
// PESAN FORM
// ============================================================

function showMessage(
  text,
  type
) {

  if (!formMessage) {
    return;
  }

  formMessage.textContent =
    text;

  formMessage.className =
    `form-message ${type}`;

  formMessage.hidden =
    false;

  formMessage.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });

}


// ============================================================
// RADIO YA / TIDAK
// ============================================================

function getRadioValue(name) {

  const checked =
    document.querySelector(
      `input[name="${name}"]:checked`
    );


  if (!checked) {
    return false;
  }


  return checked.value === "ya";
}


// ============================================================
// UPLOAD FILE
// ============================================================

async function uploadFile(
  file,
  folder
) {

  if (!file) {
    return null;
  }


  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();


  const fileName =
    `${folder}/${crypto.randomUUID()}.${extension}`;


  console.log(
    "Upload file:",
    fileName
  );


  const {
    error
  } =
    await supabaseClient
      .storage
      .from(BUCKET_NAME)
      .upload(
        fileName,
        file,
        {
          cacheControl: "3600",
          upsert: false
        }
      );


  if (error) {

    console.error(
      "Storage error:",
      error
    );

    throw new Error(
      `Gagal upload ${folder}: ${error.message}`
    );

  }


  return fileName;
}


// ============================================================
// SUBMIT FORM
// ============================================================

if (form) {

  form.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      if (formMessage) {
        formMessage.hidden = true;
      }


      // ------------------------------------------------------
      // VALIDASI
      // ------------------------------------------------------

      if (!form.checkValidity()) {

        form.reportValidity();

        return;
      }


      submitBtn.disabled = true;

      submitBtn.textContent =
        "Mengirim...";


      try {

        // ----------------------------------------------------
        // FILE
        // ----------------------------------------------------

        const fotoKKFile =
          document.getElementById(
            "foto_kk"
          )?.files[0];


        const fotoRumahFile =
          document.getElementById(
            "foto_rumah"
          )?.files[0];


        // ----------------------------------------------------
        // UPLOAD
        // ----------------------------------------------------

        const [
          fotoKKPath,
          fotoRumahPath
        ] =
          await Promise.all([

            uploadFile(
              fotoKKFile,
              "kk"
            ),

            uploadFile(
              fotoRumahFile,
              "rumah"
            )

          ]);


        // ----------------------------------------------------
        // STATUS DESIL
        // ----------------------------------------------------

        const desil1sampai5 =
          [
            "1",
            "2",
            "3",
            "4",
            "5"
          ].includes(
            statusDesilSelect.value
          );


        // ----------------------------------------------------
        // ANAK TIDAK SEKOLAH
        // ----------------------------------------------------

        const anakTidakSekolah =
          getRadioValue(
            "anak_tidak_sekolah"
          );


        // ----------------------------------------------------
        // PAYLOAD
        // ----------------------------------------------------

        const payload = {

          desa_id:
            Number(
              desaSelect.value
            ),

          kelompok_id:
            Number(
              kelompokSelect.value
            ),

          nama_kepala_keluarga:
            document
              .getElementById(
                "nama_kepala_keluarga"
              )
              .value
              .trim(),

          nomor_kk:
            document
              .getElementById(
                "nomor_kk"
              )
              .value
              .trim(),

          nik:
            document
              .getElementById(
                "nik"
              )
              .value
              .trim(),

          pekerjaan:
            document
              .getElementById(
                "pekerjaan"
              )
              .value
              .trim(),

          alamat:
            document
              .getElementById(
                "alamat"
              )
              .value
              .trim(),

          rt:
            document
              .getElementById(
                "rt"
              )
              .value
              .trim(),

          rw:
            document
              .getElementById(
                "rw"
              )
              .value
              .trim(),

          foto_kk_url:
            fotoKKPath,

          foto_rumah_url:
            fotoRumahPath,

          status_desil:
            statusDesilSelect.value,

          anak_ingin_kuliah:
            desil1sampai5
              ? anakInginKuliahCheckbox.checked
              : false,

          rumah_lantai_tanah:
            getRadioValue(
              "rumah_lantai_tanah"
            ),

          belum_ada_listrik:
            getRadioValue(
              "belum_ada_listrik"
            ),

          anak_tidak_sekolah:
            anakTidakSekolah,

          nama_anak_tidak_sekolah:
            anakTidakSekolah
              ? namaAnakTextarea.value
                .split("\n")
                .map(
                  function (nama) {
                    return nama.trim();
                  }
                )
                .filter(Boolean)
              : []

        };


        console.log(
          "PAYLOAD:",
          payload
        );


        // ----------------------------------------------------
        // INSERT SUPABASE
        // ----------------------------------------------------

        const {
          error
        } =
          await supabaseClient
            .from(TABLE_SURVEY)
            .insert([payload]);


        if (error) {

          console.error(
            "DATABASE ERROR:",
            error
          );

          throw new Error(
            error.message
          );

        }


        // ----------------------------------------------------
        // BERHASIL
        // ----------------------------------------------------

        showMessage(
          "Data berhasil dikirim. Terima kasih atas partisipasinya.",
          "success"
        );


        form.reset();


        kelompokSelect.innerHTML =
          `
          <option value="" selected disabled>
            Pilih desa terlebih dahulu
          </option>
          `;


        kelompokSelect.disabled =
          true;


        if (wrapAnakInginKuliah) {
          wrapAnakInginKuliah.hidden =
            true;
        }


        if (wrapNamaAnak) {
          wrapNamaAnak.hidden =
            true;
        }

      }

      catch (error) {

        console.error(
          "ERROR SUBMIT:",
          error
        );


        showMessage(
          `Gagal mengirim data: ${error.message}`,
          "error"
        );

      }

      finally {

        submitBtn.disabled =
          false;

        submitBtn.textContent =
          "Kirim Data";

      }

    }
  );

}


// ============================================================
// JALANKAN LOAD DATA
// ============================================================

muatDesaDanKelompok();