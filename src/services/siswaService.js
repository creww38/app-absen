const { getSheetData, appendToSheet, updateSheetRange, deleteSheetRow } = require('../config/spreadsheet');
const { formatDate } = require('../utils/dateHelper');
const { verifyUser } = require('./authService');

async function getSiswaList() {
  try {
    const data = await getSheetData('siswa');
    const siswaList = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        let rawTgl = data[i][3];
        let tglLahir = '';
        
        if (rawTgl && typeof rawTgl === 'string') {
          let cleanTgl = rawTgl.replace(/'/g, "").trim();
          if (cleanTgl.includes('-')) {
            let parts = cleanTgl.split('-');
            if (parts[2] && parts[2].length === 4) {
              tglLahir = parts[2] + '-' + parts[1] + '-' + parts[0];
            } else {
              tglLahir = cleanTgl;
            }
          }
        }
        
        siswaList.push({
          nama: data[i][0],
          nisn: data[i][1],
          jenisKelamin: data[i][2],
          tanggalLahir: tglLahir,
          agama: data[i][4],
          namaAyah: data[i][5],
          namaIbu: data[i][6],
          noHp: data[i][7],
          kelas: data[i][8],
          alamat: data[i][9]
        });
      }
    }
    
    return { success: true, data: siswaList };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

async function getSiswaByNisn(nisn) {
  try {
    const data = await getSheetData('siswa');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == nisn) {
        let tglLahir = '';
        if (data[i][3]) {
          tglLahir = formatDate(new Date(data[i][3]), 'Asia/Jakarta', 'yyyy-MM-dd');
        }
        
        return {
          success: true,
          data: {
            nama: data[i][0],
            nisn: data[i][1],
            jenisKelamin: data[i][2],
            tanggalLahir: tglLahir,
            agama: data[i][4],
            namaAyah: data[i][5],
            namaIbu: data[i][6],
            noHp: data[i][7],
            kelas: data[i][8],
            alamat: data[i][9]
          }
        };
      }
    }
    
    return { success: false, message: 'Siswa tidak ditemukan' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

async function addSiswa(token, siswaData) {
  try {
    await verifyUser(token, 'admin');
    
    const data = await getSheetData('siswa');
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == siswaData.nisn) {
        return { success: false, message: 'NISN sudah terdaftar' };
      }
    }
    
    let tglSimpan = siswaData.tanggalLahir;
    if (tglSimpan && tglSimpan.includes('-')) {
      let parts = tglSimpan.split('-');
      tglSimpan = "'" + parts[2] + '-' + parts[1] + '-' + parts[0];
    }
    
    await appendToSheet('siswa', [
      siswaData.nama,
      siswaData.nisn,
      siswaData.jenisKelamin,
      tglSimpan,
      siswaData.agama,
      siswaData.namaAyah,
      siswaData.namaIbu,
      siswaData.noHp,
      siswaData.kelas,
      siswaData.alamat
    ]);
    
    return { success: true, message: 'Siswa berhasil ditambahkan' };
  } catch (error) {
    return { success: false, message: "GAGAL: " + error.message };
  }
}

async function updateSiswa(token, oldNisn, siswaData) {
  try {
    await verifyUser(token, 'admin');
    
    const data = await getSheetData('siswa');
    
    let tglSimpan = siswaData.tanggalLahir;
    if (tglSimpan && tglSimpan.includes('-')) {
      let parts = tglSimpan.split('-');
      if (parts[0].length === 4) {
        tglSimpan = "'" + parts[2] + '-' + parts[1] + '-' + parts[0];
      }
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == oldNisn) {
        await updateSheetRange('siswa', i + 1, 1, [[
          siswaData.nama,
          siswaData.nisn,
          siswaData.jenisKelamin,
          tglSimpan,
          siswaData.agama,
          siswaData.namaAyah,
          siswaData.namaIbu,
          siswaData.noHp,
          siswaData.kelas,
          siswaData.alamat
        ]]);
        return { success: true, message: 'Siswa berhasil diupdate' };
      }
    }
    
    return { success: false, message: 'Siswa tidak ditemukan' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

async function deleteSiswa(token, nisn) {
  try {
    await verifyUser(token, 'admin');
    
    const data = await getSheetData('siswa');
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(nisn)) {
        await deleteSheetRow('siswa', i + 1);
        return { success: true, message: 'Data siswa berhasil dihapus.' };
      }
    }
    
    return { success: false, message: 'Data siswa tidak ditemukan.' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function getKelasList() {
  try {
    const data = await getSheetData('siswa');
    const kelasSet = new Set();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][8]) {
        kelasSet.add(data[i][8]);
      }
    }
    
    return { success: true, data: Array.from(kelasSet).sort() };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

async function importSiswaBulk(token, dataArray) {
  try {
    await verifyUser(token, 'admin');
    
    const existingData = await getSheetData('siswa');
    const existingNISN = new Set();
    
    for (let i = 1; i < existingData.length; i++) {
      existingNISN.add(String(existingData[i][1]).trim());
    }
    
    const rowsToAdd = [];
    let addedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const item = dataArray[i];
      const nisn = String(item.nisn).trim();
      
      if (!item.nama || !nisn) {
        skippedCount++;
        continue;
      }
      
      if (existingNISN.has(nisn)) {
        skippedCount++;
        continue;
      }
      
      let tglLahir = item.tanggalLahir;
      let formattedTgl = tglLahir;
      if (tglLahir && tglLahir.includes('-')) {
        let parts = tglLahir.split('-');
        if (parts[0].length === 4) {
          formattedTgl = "'" + parts[2] + '-' + parts[1] + '-' + parts[0];
        }
      }
      
      rowsToAdd.push([
        item.nama,
        "'" + nisn,
        item.jenisKelamin,
        formattedTgl,
        item.agama,
        item.namaAyah,
        item.namaIbu,
        "'" + item.noHp,
        item.kelas,
        item.alamat
      ]);
      
      existingNISN.add(nisn);
      addedCount++;
    }
    
    for (const row of rowsToAdd) {
      await appendToSheet('siswa', row);
    }
    
    return { 
      success: true, 
      added: addedCount, 
      skipped: skippedCount, 
      message: `Import selesai. Berhasil: ${addedCount}, Duplikat/Gagal: ${skippedCount}` 
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

module.exports = {
  getSiswaList,
  getSiswaByNisn,
  addSiswa,
  updateSiswa,
  deleteSiswa,
  getKelasList,
  importSiswaBulk
};