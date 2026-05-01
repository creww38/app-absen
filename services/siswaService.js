const { getSheetData, appendToSheet, updateSheetCell, deleteSheetRow } = require('./googleSheetsService');
const { requireRole } = require('./authService');

async function getAll() {
  try {
    const data = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    const siswaList = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        siswaList.push({
          nama: data[i][0],
          nisn: data[i][1],
          jenisKelamin: data[i][2],
          tanggalLahir: data[i][3],
          agama: data[i][4],
          namaAyah: data[i][5],
          namaIbu: data[i][6],
          noHp: data[i][7],
          kelas: data[i][8],
          alamat: data[i][9]
        });
      }
    }
    
    return { success: true, data: siswaList, total: siswaList.length };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function getByNisn(nisn) {
  try {
    const data = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == nisn) {
        return {
          success: true,
          data: {
            nama: data[i][0],
            nisn: data[i][1],
            jenisKelamin: data[i][2],
            tanggalLahir: data[i][3],
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
    return { success: false, message: error.message };
  }
}

async function getKelasList() {
  try {
    const data = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    const kelasSet = new Set();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][8]) {
        kelasSet.add(data[i][8]);
      }
    }
    
    return { success: true, data: Array.from(kelasSet).sort() };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function create(token, siswaData) {
  try {
    await requireRole(token, 'admin');
    
    const data = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == siswaData.nisn) {
        return { success: false, message: 'NISN sudah terdaftar' };
      }
    }
    
    await appendToSheet(process.env.SHEET_SISWA || 'siswa', [
      siswaData.nama,
      siswaData.nisn,
      siswaData.jenisKelamin,
      siswaData.tanggalLahir,
      siswaData.agama,
      siswaData.namaAyah,
      siswaData.namaIbu,
      siswaData.noHp,
      siswaData.kelas,
      siswaData.alamat
    ]);
    
    return { success: true, message: 'Siswa berhasil ditambahkan' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function update(token, oldNisn, siswaData) {
  try {
    await requireRole(token, 'admin');
    
    const data = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == oldNisn) {
        const row = i + 1;
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 1, siswaData.nama);
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 2, siswaData.nisn);
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 3, siswaData.jenisKelamin);
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 4, siswaData.tanggalLahir);
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 5, siswaData.agama);
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 6, siswaData.namaAyah);
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 7, siswaData.namaIbu);
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 8, siswaData.noHp);
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 9, siswaData.kelas);
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 10, siswaData.alamat);
        
        return { success: true, message: 'Siswa berhasil diupdate' };
      }
    }
    
    return { success: false, message: 'Siswa tidak ditemukan' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function delete_(token, nisn) {
  try {
    await requireRole(token, 'admin');
    
    const data = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(nisn)) {
        await deleteSheetRow(process.env.SHEET_SISWA || 'siswa', i + 1);
        return { success: true, message: 'Siswa berhasil dihapus' };
      }
    }
    
    return { success: false, message: 'Siswa tidak ditemukan' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function bulkImport(token, dataArray) {
  try {
    await requireRole(token, 'admin');
    
    let added = 0;
    let skipped = 0;
    
    for (const item of dataArray) {
      if (item.nama && item.nisn) {
        await appendToSheet(process.env.SHEET_SISWA || 'siswa', [
          item.nama, item.nisn, item.jenisKelamin || '',
          item.tanggalLahir || '', item.agama || '',
          item.namaAyah || '', item.namaIbu || '',
          item.noHp || '', item.kelas || '', item.alamat || ''
        ]);
        added++;
      } else {
        skipped++;
      }
    }
    
    return { success: true, added, skipped, message: `Import selesai: ${added} berhasil, ${skipped} gagal` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = {
  getAll,
  getByNisn,
  getKelasList,
  create,
  update,
  delete: delete_,
  bulkImport
};
