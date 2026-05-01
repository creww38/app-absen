const { getSheetData, appendToSheet, deleteSheetRow, updateSheetRange } = require('../config/spreadsheet');
const { formatDate } = require('../utils/dateHelper');
const { verifyUser } = require('./authService');

async function getHariLibur(token) {
  try {
    await verifyUser(token, 'guru');
    
    const data = await getSheetData(process.env.SHEET_LIBUR || 'hari_libur');
    const list = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        let tgl = formatDate(new Date(data[i][0]), process.env.TIMEZONE || 'Asia/Jakarta', 'yyyy-MM-dd');
        list.push({
          tanggal: tgl,
          keterangan: data[i][1]
        });
      }
    }
    
    list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return { success: true, data: list };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

async function addHariLibur(token, tanggal, keterangan) {
  try {
    await verifyUser(token, 'admin');
    
    await appendToSheet(process.env.SHEET_LIBUR || 'hari_libur', [tanggal, keterangan]);
    return { success: true, message: 'Hari libur berhasil ditambahkan' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

async function updateHariLibur(token, oldDateStr, newDateStr, newKeterangan) {
  try {
    await verifyUser(token, 'admin');
    
    const data = await getSheetData(process.env.SHEET_LIBUR || 'hari_libur');
    let found = false;
    
    for (let i = 1; i < data.length; i++) {
      let rowDate = formatDate(new Date(data[i][0]), process.env.TIMEZONE || 'Asia/Jakarta', 'yyyy-MM-dd');
      
      if (rowDate === oldDateStr) {
        await updateSheetRange(process.env.SHEET_LIBUR || 'hari_libur', i + 1, 1, [[new Date(newDateStr), newKeterangan]]);
        found = true;
        break;
      }
    }
    
    if (found) {
      return { success: true, message: 'Hari libur berhasil diperbarui' };
    } else {
      return { success: false, message: 'Data tanggal lama tidak ditemukan' };
    }
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

async function deleteHariLibur(token, tanggalStr) {
  try {
    await verifyUser(token, 'admin');
    
    const data = await getSheetData(process.env.SHEET_LIBUR || 'hari_libur');
    
    for (let i = 1; i < data.length; i++) {
      let rowDate = formatDate(new Date(data[i][0]), process.env.TIMEZONE || 'Asia/Jakarta', 'yyyy-MM-dd');
      if (rowDate === tanggalStr) {
        await deleteSheetRow(process.env.SHEET_LIBUR || 'hari_libur', i + 1);
        return { success: true, message: 'Hari libur dihapus' };
      }
    }
    return { success: false, message: 'Data tidak ditemukan' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

module.exports = {
  getHariLibur,
  addHariLibur,
  updateHariLibur,
  deleteHariLibur
};