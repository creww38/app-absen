const { getSheetData, updateSheetCell } = require('./googleSheetsService');
const { requireRole } = require('./authService');

async function get() {
  try {
    const data = await getSheetData(process.env.SHEET_KONFIGURASI || 'konfigurasi');
    let config = {
      jam_masuk_mulai: '06:00',
      jam_masuk_akhir: '07:15',
      jam_pulang_mulai: '15:00',
      jam_pulang_akhir: '17:00'
    };
    
    for (let i = 1; i < data.length; i++) {
      if (config.hasOwnProperty(data[i][0])) {
        config[data[i][0]] = data[i][1];
      }
    }
    
    return { success: true, data: config };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function update(token, newConfig) {
  try {
    await requireRole(token, 'admin');
    
    const data = await getSheetData(process.env.SHEET_KONFIGURASI || 'konfigurasi');
    
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      if (newConfig[key]) {
        await updateSheetCell(process.env.SHEET_KONFIGURASI || 'konfigurasi', i + 1, 2, newConfig[key]);
      }
    }
    
    return { success: true, message: 'Konfigurasi berhasil disimpan' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = { get, update };
