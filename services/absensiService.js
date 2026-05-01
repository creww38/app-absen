const { getSheetData, appendToSheet, updateSheetCell } = require('./googleSheetsService');
const { verifyToken } = require('./authService');

async function scan(token, nisn, scannerRole, scannerKelas) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const nowTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const siswaData = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    let siswa = null;
    
    for (let i = 1; i < siswaData.length; i++) {
      if (String(siswaData[i][1]).trim() === String(nisn).trim()) {
        siswa = {
          nama: siswaData[i][0],
          nisn: siswaData[i][1],
          kelas: siswaData[i][8]
        };
        break;
      }
    }
    
    if (!siswa) {
      return { success: false, message: 'NISN tidak terdaftar' };
    }
    
    if (scannerRole === 'guru' && scannerKelas && siswa.kelas !== scannerKelas) {
      return { 
        success: false, 
        message: `Ditolak! Siswa ini kelas ${siswa.kelas}. Anda hanya bisa scan kelas ${scannerKelas}.` 
      };
    }
    
    const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
    let existing = false;
    let rowIndex = -1;
    
    for (let i = 1; i < absensiData.length; i++) {
      if (!absensiData[i][0]) continue;
      const rowDate = new Date(absensiData[i][0]).toISOString().split('T')[0];
      const rowNisn = String(absensiData[i][1]).trim();
      
      if (rowDate === today && rowNisn === String(nisn).trim()) {
        existing = true;
        rowIndex = i + 1;
        break;
      }
    }
    
    if (!existing) {
      await appendToSheet(process.env.SHEET_ABSENSI || 'absensi', [
        new Date(), nisn, siswa.nama, siswa.kelas, nowTime, '', 'Tepat Waktu', 'Hadir'
      ]);
      return {
        success: true,
        message: 'Absen Masuk Berhasil',
        type: 'datang',
        jamDatang: nowTime,
        nama: siswa.nama,
        kelas: siswa.kelas,
        status: 'Hadir'
      };
    } else {
      const jamPulang = absensiData[rowIndex - 1][5];
      if (jamPulang) {
        return { success: false, message: 'Siswa sudah melakukan absen pulang hari ini.' };
      }
      
      await updateSheetCell(process.env.SHEET_ABSENSI || 'absensi', rowIndex, 6, nowTime);
      await updateSheetCell(process.env.SHEET_ABSENSI || 'absensi', rowIndex, 7, 'Pulang');
      
      return {
        success: true,
        message: 'Absen Pulang Berhasil',
        type: 'pulang',
        jamPulang: nowTime,
        nama: siswa.nama,
        kelas: siswa.kelas,
        status: 'Hadir'
      };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function getToday(nisn) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
    
    for (let i = 1; i < absensiData.length; i++) {
      if (!absensiData[i][0]) continue;
      const rowDate = new Date(absensiData[i][0]).toISOString().split('T')[0];
      const rowNisn = String(absensiData[i][1]).trim();
      
      if (rowDate === today && rowNisn === String(nisn).trim()) {
        return {
          success: true,
          data: {
            tanggal: rowDate,
            jamDatang: absensiData[i][4],
            jamPulang: absensiData[i][5],
            status: absensiData[i][6]
          },
          isLibur: false
        };
      }
    }
    
    return { success: true, data: null, isLibur: false };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function getList(filter = {}) {
  try {
    const data = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
    const result = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        result.push({
          tanggal: new Date(data[i][0]).toISOString().split('T')[0],
          nisn: data[i][1],
          nama: data[i][2],
          kelas: data[i][3],
          jamDatang: data[i][4],
          jamPulang: data[i][5] || '-',
          keterangan: data[i][6] || '-',
          status: data[i][7] || '-'
        });
      }
    }
    
    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = { scan, getToday, getList };
