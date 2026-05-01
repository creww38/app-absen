const { getSheetData, appendToSheet, updateSheetCell, deleteSheetRow } = require('./googleSheetsService');
const { requireRole } = require('./authService');

async function getAll(token) {
  try {
    await requireRole(token, 'admin');
    
    const data = await getSheetData(process.env.SHEET_GURU || 'users');
    const guruList = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === 'guru') {
        guruList.push({
          username: data[i][0],
          password: data[i][1],
          role: data[i][2],
          kelas: data[i][3] || ""
        });
      }
    }
    
    return { success: true, data: guruList };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function create(token, username, password, kelas) {
  try {
    await requireRole(token, 'admin');
    
    const data = await getSheetData(process.env.SHEET_GURU || 'users');
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === username) {
        return { success: false, message: 'Username sudah terdaftar' };
      }
    }
    
    await appendToSheet(process.env.SHEET_GURU || 'users', [username, password, 'guru', kelas]);
    return { success: true, message: 'Guru berhasil ditambahkan' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function update(token, oldUsername, newUsername, password, kelas) {
  try {
    await requireRole(token, 'admin');
    
    const data = await getSheetData(process.env.SHEET_GURU || 'users');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === oldUsername && data[i][2] === 'guru') {
        const row = i + 1;
        await updateSheetCell(process.env.SHEET_GURU || 'users', row, 1, newUsername);
        await updateSheetCell(process.env.SHEET_GURU || 'users', row, 2, password);
        await updateSheetCell(process.env.SHEET_GURU || 'users', row, 4, kelas);
        return { success: true, message: 'Guru berhasil diupdate' };
      }
    }
    
    return { success: false, message: 'Guru tidak ditemukan' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function delete_(token, username) {
  try {
    await requireRole(token, 'admin');
    
    const data = await getSheetData(process.env.SHEET_GURU || 'users');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === username && data[i][2] === 'guru') {
        await deleteSheetRow(process.env.SHEET_GURU || 'users', i + 1);
        return { success: true, message: 'Guru berhasil dihapus' };
      }
    }
    
    return { success: false, message: 'Guru tidak ditemukan' };
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
      if (item.username && item.password) {
        await appendToSheet(process.env.SHEET_GURU || 'users', [
          item.username, item.password, 'guru', item.kelas || ''
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
  create,
  update,
  delete: delete_,
  bulkImport
};
