const { getSheetData, appendToSheet, updateSheetRange, deleteSheetRow } = require('../config/spreadsheet');
const { verifyUser } = require('./authService');

async function getGuruList(token) {
  try {
    await verifyUser(token, 'admin');
    
    const data = await getSheetData('users');
    const guruList = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] == 'guru') {
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

async function addGuru(token, username, password, kelas) {
  try {
    await verifyUser(token, 'admin');
    
    const data = await getSheetData('users');
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == username) {
        return { success: false, message: 'Username sudah terdaftar' };
      }
    }
    
    await appendToSheet('users', [username, password, 'guru', kelas]);
    return { success: true, message: 'Guru berhasil ditambahkan' };
  } catch (error) {
    return { success: false, message: "Akses Ditolak: " + error.message };
  }
}

async function updateGuru(token, oldUsername, newUsername, password, kelas) {
  try {
    await verifyUser(token, 'admin');
    
    const data = await getSheetData('users');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == oldUsername && data[i][2] == 'guru') {
        await updateSheetRange('users', i + 1, 1, [[newUsername, password, 'guru', kelas]]);
        return { success: true, message: 'Guru berhasil diupdate' };
      }
    }
    return { success: false, message: 'Guru tidak ditemukan' };
  } catch (error) {
    return { success: false, message: "Akses Ditolak: " + error.message };
  }
}

async function deleteGuru(token, username) {
  try {
    await verifyUser(token, 'admin');
    
    const data = await getSheetData('users');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == username && data[i][2] == 'guru') {
        await deleteSheetRow('users', i + 1);
        return { success: true, message: 'Guru berhasil dihapus' };
      }
    }
    return { success: false, message: 'Guru tidak ditemukan' };
  } catch (error) {
    return { success: false, message: "Akses Ditolak: " + error.message };
  }
}

async function importGuruBulk(token, dataArray) {
  try {
    await verifyUser(token, 'admin');
    
    const existingData = await getSheetData('users');
    const existingUsernames = new Set();
    
    for (let i = 1; i < existingData.length; i++) {
      existingUsernames.add(String(existingData[i][0]).trim());
    }
    
    const rowsToAdd = [];
    let addedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const item = dataArray[i];
      const username = String(item.username).trim();
      
      if (!username || !item.password) {
        skippedCount++;
        continue;
      }
      
      if (existingUsernames.has(username)) {
        skippedCount++;
        continue;
      }
      
      rowsToAdd.push([
        "'" + username,
        "'" + item.password,
        'guru',
        item.kelas || ''
      ]);
      
      existingUsernames.add(username);
      addedCount++;
    }
    
    for (const row of rowsToAdd) {
      await appendToSheet('users', row);
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
  getGuruList,
  addGuru,
  updateGuru,
  deleteGuru,
  importGuruBulk
};