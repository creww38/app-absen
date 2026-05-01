const { getSheetData, updateSheetCell } = require('../config/spreadsheet');
const { verifyUser } = require('./authService');

async function getAppConfig(token) {
  try {
    await verifyUser(token, 'guru');
    
    const data = await getSheetData(process.env.SHEET_KONFIGURASI || 'konfigurasi');
    let config = {
      jam_masuk_mulai: '06:00',
      jam_masuk_akhir: '07:15',
      jam_pulang_mulai: '15:00',
      jam_pulang_akhir: '17:00'
    };
    
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      const val = data[i][1];
      if (config.hasOwnProperty(key)) {
        config[key] = String(val);
      }
    }
    return { success: true, data: config };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

async function saveAppConfig(token, newConfig) {
  try {
    await verifyUser(token, 'admin');
    
    const data = await getSheetData(process.env.SHEET_KONFIGURASI || 'konfigurasi');
    
    const updateRow = async (key, val) => {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          await updateSheetCell(process.env.SHEET_KONFIGURASI || 'konfigurasi', i + 1, 2, "'" + val);
          return;
        }
      }
    };
    
    await updateRow('jam_masuk_mulai', newConfig.jam_masuk_mulai);
    await updateRow('jam_masuk_akhir', newConfig.jam_masuk_akhir);
    await updateRow('jam_pulang_mulai', newConfig.jam_pulang_mulai);
    await updateRow('jam_pulang_akhir', newConfig.jam_pulang_akhir);
    
    return { success: true, message: 'Konfigurasi waktu berhasil disimpan' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

async function setupInitialData(token) {
  try {
    await verifyUser(token, 'admin');
    
    const sheets = require('../config/spreadsheet');
    const ss = sheets;
    
    // Check and create users sheet
    let usersData = await ss.getSheetData(process.env.SHEET_GURU || 'users');
    if (usersData.length === 0) {
      await ss.appendToSheet(process.env.SHEET_GURU || 'users', ['Username', 'Password', 'Role', 'Kelas']);
      await ss.appendToSheet(process.env.SHEET_GURU || 'users', ['admin', 'admin123', 'admin', '']);
      await ss.appendToSheet(process.env.SHEET_GURU || 'users', ['guru1', 'guru123', 'guru', 'VI B']);
    }
    
    // Check and create siswa sheet
    let siswaData = await ss.getSheetData(process.env.SHEET_SISWA || 'siswa');
    if (siswaData.length === 0) {
      await ss.appendToSheet(process.env.SHEET_SISWA || 'siswa', [
        'Nama Lengkap', 'NISN', 'Jenis Kelamin', 'Tanggal Lahir', 'Agama',
        'Nama Ayah', 'Nama Ibu', 'No Handphone', 'Kelas', 'Alamat'
      ]);
      await ss.appendToSheet(process.env.SHEET_SISWA || 'siswa', [
        'Ahmad Rizki', '1234567890', 'Laki-laki', '2008-05-15', 'Islam',
        'Budi Santoso', 'Siti Aminah', '081234567890', 'VI B', 'Jl. Merdeka No. 10, Bengkulu'
      ]);
    }
    
    // Check and create absensi sheet
    let absensiData = await ss.getSheetData(process.env.SHEET_ABSENSI || 'absensi');
    if (absensiData.length === 0) {
      await ss.appendToSheet(process.env.SHEET_ABSENSI || 'absensi', [
        'Tanggal', 'NISN', 'Nama', 'Kelas', 'Jam Datang', 'Jam Pulang', 'Keterangan Waktu', 'Status'
      ]);
    }
    
    // Check and create sessions sheet
    let sessionsData = await ss.getSheetData(process.env.SHEET_SESSIONS || 'sessions');
    if (sessionsData.length === 0) {
      await ss.appendToSheet(process.env.SHEET_SESSIONS || 'sessions', ['Token', 'Identifier', 'Role', 'Expiry']);
    }
    
    // Check and create konfigurasi sheet
    let configData = await ss.getSheetData(process.env.SHEET_KONFIGURASI || 'konfigurasi');
    if (configData.length === 0) {
      await ss.appendToSheet(process.env.SHEET_KONFIGURASI || 'konfigurasi', ['Key', 'Value', 'Keterangan']);
      await ss.appendToSheet(process.env.SHEET_KONFIGURASI || 'konfigurasi', ['jam_masuk_mulai', '06:00', 'Waktu absen datang dibuka']);
      await ss.appendToSheet(process.env.SHEET_KONFIGURASI || 'konfigurasi', ['jam_masuk_akhir', '07:15', 'Batas waktu terlambat']);
      await ss.appendToSheet(process.env.SHEET_KONFIGURASI || 'konfigurasi', ['jam_pulang_mulai', '15:00', 'Waktu absen pulang dibuka']);
      await ss.appendToSheet(process.env.SHEET_KONFIGURASI || 'konfigurasi', ['jam_pulang_akhir', '17:00', 'Batas akhir absen pulang']);
    }
    
    // Check and create libur sheet
    let liburData = await ss.getSheetData(process.env.SHEET_LIBUR || 'hari_libur');
    if (liburData.length === 0) {
      await ss.appendToSheet(process.env.SHEET_LIBUR || 'hari_libur', ['Tanggal', 'Keterangan']);
    }
    
    return { success: true, message: 'Setup database berhasil' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

module.exports = {
  getAppConfig,
  saveAppConfig,
  setupInitialData
};