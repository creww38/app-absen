const { getSheetData, updateSheetCell, appendToSheet } = require('./googleSheetsService');
const { verifyToken } = require('./authService');

async function getRealtime(token, filterKelas = null) {
  try {
    await verifyToken(token);
    
    const today = new Date().toISOString().split('T')[0];
    const siswaData = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
    
    const absensiMap = {};
    for (let i = 1; i < absensiData.length; i++) {
      if (!absensiData[i][0]) continue;
      const rowDate = new Date(absensiData[i][0]).toISOString().split('T')[0];
      const nisn = String(absensiData[i][1]).trim();
      
      if (rowDate === today) {
        absensiMap[nisn] = {
          jamDatang: absensiData[i][4] || '-',
          jamPulang: absensiData[i][5] || '-',
          keterangan: absensiData[i][6] || '-',
          status: absensiData[i][7] || 'Belum Absen'
        };
      }
    }
    
    const result = [];
    for (let i = 1; i < siswaData.length; i++) {
      const nisn = String(siswaData[i][1]).trim();
      const kelas = siswaData[i][8];
      
      if (filterKelas && kelas !== filterKelas) continue;
      
      const info = absensiMap[nisn] || {
        jamDatang: '-',
        jamPulang: '-',
        keterangan: '-',
        status: 'Belum Absen'
      };
      
      result.push({
        nama: siswaData[i][0],
        nisn: nisn,
        kelas: kelas,
        jamDatang: info.jamDatang,
        jamPulang: info.jamPulang,
        keterangan: info.keterangan,
        status: info.status
      });
    }
    
    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function updateStatus(token, nisn, nama, kelas, newStatus) {
  try {
    await verifyToken(token);
    
    const today = new Date().toISOString().split('T')[0];
    const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
    
    let found = false;
    let rowIndex = -1;
    
    for (let i = 1; i < absensiData.length; i++) {
      if (!absensiData[i][0]) continue;
      const rowDate = new Date(absensiData[i][0]).toISOString().split('T')[0];
      const rowNisn = String(absensiData[i][1]).trim();
      
      if (rowDate === today && rowNisn === String(nisn).trim()) {
        found = true;
        rowIndex = i + 1;
        break;
      }
    }
    
    if (found) {
      await updateSheetCell(process.env.SHEET_ABSENSI || 'absensi', rowIndex, 8, newStatus);
    } else {
      await appendToSheet(process.env.SHEET_ABSENSI || 'absensi', [
        new Date(), nisn, nama, kelas, '-', '-', '-', newStatus
      ]);
    }
    
    return { success: true, message: 'Status berhasil diubah' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = { getRealtime, updateStatus };
