const { getSheetData, updateSheetCell } = require('../config/spreadsheet');
const { formatDate, getCurrentDate } = require('../utils/dateHelper');
const { verifyUser } = require('./authService');

async function getMonitoringRealtime(token, filterKelas = null) {
  try {
    // Verify user has access (guru or admin)
    await verifyUser(token, 'guru');
    
    const todayStr = getCurrentDate();
    const siswaData = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
    
    // Mapping data absensi hari ini
    let absensiMap = {};
    for (let i = 1; i < absensiData.length; i++) {
      let rowDate = absensiData[i][0];
      if (!rowDate) continue;

      let tgl = formatDate(new Date(rowDate), process.env.TIMEZONE || 'Asia/Jakarta', 'yyyy-MM-dd');
      let nisn = String(absensiData[i][1]).trim();
      
      if (tgl === todayStr) {
        absensiMap[nisn] = {
          jamDatang: absensiData[i][4],
          jamPulang: absensiData[i][5],
          keterangan: absensiData[i][6],
          status: absensiData[i][7]
        };
      }
    }

    let result = [];
    for (let i = 1; i < siswaData.length; i++) {
      let nama = siswaData[i][0];
      let nisn = String(siswaData[i][1]).trim();
      let kelas = siswaData[i][8];

      // Filter Kelas
      if (filterKelas && kelas !== filterKelas) continue;
      
      let statusInfo = absensiMap[nisn];
      
      let jamDatang = '-';
      let jamPulang = '-';
      let displayStatus = 'Belum Absen';
      let keteranganWaktu = '-';

      if (statusInfo) {
        // Format Jam Datang
        if (statusInfo.jamDatang && statusInfo.jamDatang instanceof Date) {
          jamDatang = formatDate(statusInfo.jamDatang, process.env.TIMEZONE || 'Asia/Jakarta', 'HH:mm');
        } else if (statusInfo.jamDatang) {
          jamDatang = String(statusInfo.jamDatang).substring(0, 5);
        }

        // Format Jam Pulang
        if (statusInfo.jamPulang && statusInfo.jamPulang instanceof Date) {
          jamPulang = formatDate(statusInfo.jamPulang, process.env.TIMEZONE || 'Asia/Jakarta', 'HH:mm');
        } else if (statusInfo.jamPulang) {
          jamPulang = String(statusInfo.jamPulang).substring(0, 5);
        }

        displayStatus = statusInfo.status ? String(statusInfo.status) : "Hadir";
        
        if (statusInfo.keterangan && String(statusInfo.keterangan).trim() !== "") {
          keteranganWaktu = String(statusInfo.keterangan);
        } else if (displayStatus === 'Hadir') {
          keteranganWaktu = 'Tepat Waktu';
        }
      }

      result.push({
        nama: nama,
        nisn: nisn,
        kelas: kelas,
        jamDatang: jamDatang,
        jamPulang: jamPulang,
        status: displayStatus,
        keterangan: keteranganWaktu
      });
    }

    result.sort((a, b) => {
      if (a.kelas === b.kelas) return a.nama.localeCompare(b.nama);
      return a.kelas.localeCompare(b.kelas);
    });
    
    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

async function updateAbsensiStatus(token, nisn, nama, kelas, newStatus) {
  try {
    await verifyUser(token, 'guru');
    
    const todayStr = getCurrentDate();
    const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
    
    let found = false;
    let rowIndex = -1;

    for (let i = 1; i < absensiData.length; i++) {
      if (!absensiData[i][0]) continue;
      
      let tgl = formatDate(new Date(absensiData[i][0]), process.env.TIMEZONE || 'Asia/Jakarta', 'yyyy-MM-dd');
      let rowNisn = String(absensiData[i][1]).trim();
      
      if (tgl === todayStr && rowNisn === String(nisn).trim()) {
        found = true;
        rowIndex = i + 1;
        break;
      }
    }

    if (found) {
      await updateSheetCell(process.env.SHEET_ABSENSI || 'absensi', rowIndex, 8, newStatus);
    } else {
      let jamDatang = '-';
      if (newStatus === 'Hadir') {
        jamDatang = formatDate(new Date(), process.env.TIMEZONE || 'Asia/Jakarta', 'HH:mm:ss');
      }
      
      const sheets = require('../config/spreadsheet');
      await sheets.appendToSheet(process.env.SHEET_ABSENSI || 'absensi', [
        new Date(),
        "'" + nisn,
        nama,
        kelas,
        jamDatang,
        '',
        '-',
        newStatus
      ]);
    }

    return { success: true, message: 'Status berhasil diubah' };
  } catch (error) {
    return { success: false, message: "Gagal: " + error.message };
  }
}

async function getRekapBulanan(token, bulan, tahun, kelas = null) {
  try {
    await verifyUser(token, 'guru');
    
    const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
    const siswaData = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    
    // Filter siswa berdasarkan kelas
    let siswaList = [];
    for (let i = 1; i < siswaData.length; i++) {
      if (kelas && siswaData[i][8] !== kelas) continue;
      siswaList.push({
        nama: siswaData[i][0],
        nisn: String(siswaData[i][1]).trim(),
        kelas: siswaData[i][8]
      });
    }
    
    // Inisialisasi rekap
    let rekap = {};
    siswaList.forEach(siswa => {
      rekap[siswa.nisn] = {
        nama: siswa.nama,
        kelas: siswa.kelas,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        terlambat: 0
      };
    });
    
    // Proses data absensi
    for (let i = 1; i < absensiData.length; i++) {
      if (!absensiData[i][0]) continue;
      
      let tgl = new Date(absensiData[i][0]);
      let bulanData = tgl.getMonth() + 1;
      let tahunData = tgl.getFullYear();
      let nisn = String(absensiData[i][1]).trim();
      let status = absensiData[i][7];
      let keterangan = absensiData[i][6];
      
      if (bulanData === parseInt(bulan) && tahunData === parseInt(tahun) && rekap[nisn]) {
        // Count status
        if (status === 'Hadir') rekap[nisn].hadir++;
        else if (status === 'Sakit') rekap[nisn].sakit++;
        else if (status === 'Izin') rekap[nisn].izin++;
        else if (status === 'Alpa') rekap[nisn].alpa++;
        
        // Count terlambat
        if (keterangan && keterangan.includes('Terlambat')) {
          rekap[nisn].terlambat++;
        }
      }
    }
    
    const result = Object.values(rekap);
    result.sort((a, b) => a.kelas.localeCompare(b.kelas) || a.nama.localeCompare(b.nama));
    
    return { success: true, data: result };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

module.exports = {
  getMonitoringRealtime,
  updateAbsensiStatus,
  getRekapBulanan
};