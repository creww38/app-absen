const { getSheetData, appendToSheet, updateSheetCell } = require('../config/spreadsheet');
const { formatDate, calculateTimeDiff, getCurrentTime, getCurrentDate } = require('../utils/dateHelper');
const { verifyUser } = require('./authService');

async function getAppConfig() {
  try {
    const data = await getSheetData('konfigurasi');
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
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

async function scanAbsensi(nisn, scannerRole, scannerKelas) {
  try {
    const today = getCurrentDate();
    const nowTime = getCurrentTime().substring(0, 5);
    
    const configResult = await getAppConfig();
    const config = configResult.success ? configResult.data : {
      jam_masuk_akhir: '07:15',
      jam_pulang_mulai: '15:00',
      jam_pulang_akhir: '17:00'
    };
    
    // Check holiday
    const liburData = await getSheetData('hari_libur');
    for (let i = 1; i < liburData.length; i++) {
      if (liburData[i][0]) {
        let tglLibur = formatDate(new Date(liburData[i][0]), 'Asia/Jakarta', 'yyyy-MM-dd');
        if (tglLibur === today) {
          return { success: false, message: 'Absensi DITUTUP. Hari ini libur: ' + liburData[i][1] };
        }
      }
    }
    
    const absensiData = await getSheetData('absensi');
    const siswaData = await getSheetData('siswa');
    
    const scannedNisn = String(nisn).trim();
    if (scannedNisn === "" || scannedNisn === "undefined") {
      return { success: false, message: 'QR Code tidak valid atau kosong.' };
    }
    
    // Find student
    let siswa = null;
    for (let i = 1; i < siswaData.length; i++) {
      if (String(siswaData[i][1]).trim() === scannedNisn) {
        siswa = {
          nama: siswaData[i][0],
          nisn: siswaData[i][1],
          kelas: siswaData[i][8]
        };
        break;
      }
    }
    
    if (!siswa) {
      return { success: false, message: 'NISN tidak terdaftar di database.' };
    }
    
    // Validate teacher's class
    if (scannerRole === 'guru') {
      const kelasSiswa = String(siswa.kelas).trim().toUpperCase();
      const kelasGuru = String(scannerKelas).trim().toUpperCase();
      if (kelasGuru && kelasSiswa !== kelasGuru) {
        return { 
          success: false, 
          message: `Ditolak! Siswa ini kelas ${siswa.kelas}. Anda hanya bisa scan kelas ${scannerKelas}.` 
        };
      }
    }
    
    // Process attendance
    for (let i = 1; i < absensiData.length; i++) {
      const rowDateCell = absensiData[i][0];
      if (!rowDateCell) continue;
      
      const rowDateStr = formatDate(new Date(rowDateCell), 'Asia/Jakarta', 'yyyy-MM-dd');
      const rowNisn = String(absensiData[i][1]).trim();
      
      // Check-out scenario
      if (rowDateStr === today && rowNisn === scannedNisn) {
        if (absensiData[i][5]) {
          return { success: false, message: 'Siswa sudah melakukan absen pulang hari ini.' };
        } else {
          if (nowTime > config.jam_pulang_akhir) {
            return { 
              success: false, 
              message: `Gagal! Batas waktu pulang (${config.jam_pulang_akhir}) sudah lewat.` 
            };
          }
          
          let jamDatangRaw = absensiData[i][4];
          let jamDatangStr = jamDatangRaw ? String(jamDatangRaw).substring(0, 5) : '00:00';
          
          const minutesDiff = calculateTimeDiff(jamDatangStr, nowTime);
          if (minutesDiff < 10) {
            return { success: false, message: `Terlalu Cepat! Tunggu sebentar lagi.` };
          }
          
          let ketSaatIni = absensiData[i][6] || '';
          let ketBaru = ketSaatIni;
          let pesanPulang = 'Absen Pulang Berhasil';
          
          if (nowTime < config.jam_pulang_mulai) {
            ketBaru = ketSaatIni ? ketSaatIni + " & Pulang Cepat" : "Pulang Cepat";
            pesanPulang = 'Absen Pulang (Pulang Cepat)';
          }
          
          const jamPulang = getCurrentTime();
          await updateSheetCell('absensi', i + 1, 6, jamPulang);
          await updateSheetCell('absensi', i + 1, 7, ketBaru);
          
          return {
            success: true,
            message: pesanPulang,
            type: 'pulang',
            jamPulang: jamPulang,
            nama: siswa.nama,
            kelas: siswa.kelas,
            status: 'Hadir'
          };
        }
      }
    }
    
    // Check-in scenario
    if (nowTime > config.jam_pulang_akhir) {
      return { success: false, message: `Absensi Ditutup! Sudah melewati jam operasional.` };
    }
    
    let keteranganWaktu = 'Tepat Waktu';
    let statusKehadiran = 'Hadir';
    
    if (nowTime > config.jam_masuk_akhir) {
      const lateMinutes = calculateTimeDiff(config.jam_masuk_akhir, nowTime);
      keteranganWaktu = `Terlambat (${lateMinutes} m)`;
    }
    
    const jamDatang = getCurrentTime();
    
    await appendToSheet('absensi', [
      new Date(),        
      "'" + scannedNisn, 
      siswa.nama,        
      siswa.kelas,       
      jamDatang,         
      '',                
      keteranganWaktu,   
      statusKehadiran    
    ]);
    
    let responseMessage = 'Absen Masuk Berhasil';
    if (keteranganWaktu.includes('Terlambat')) {
      responseMessage = `Absen Masuk (${keteranganWaktu})`;
    }
    
    return {
      success: true,
      message: responseMessage,
      type: 'datang',
      jamDatang: jamDatang,
      nama: siswa.nama,
      kelas: siswa.kelas,
      status: statusKehadiran
    };
  } catch (error) {
    return { success: false, message: "Error Server: " + error.toString() };
  }
}

async function getAbsensiToday(nisn) {
  try {
    const todayStr = getCurrentDate();
    
    const liburData = await getSheetData('hari_libur');
    let isLibur = false;
    let keteranganLibur = "";
    
    for (let i = 1; i < liburData.length; i++) {
      let tgl = formatDate(new Date(liburData[i][0]), 'Asia/Jakarta', 'yyyy-MM-dd');
      if (tgl === todayStr) {
        isLibur = true;
        keteranganLibur = liburData[i][1];
        break;
      }
    }
    
    const data = await getSheetData('absensi');
    const searchNisn = String(nisn).trim();
    
    let absensiData = null;
    
    for (let i = 1; i < data.length; i++) {
      const rowDateCell = data[i][0];
      if (!rowDateCell) continue;
      
      const rowDateStr = formatDate(new Date(rowDateCell), 'Asia/Jakarta', 'yyyy-MM-dd');
      const rowNisn = String(data[i][1]).trim();
      
      if (rowDateStr === todayStr && rowNisn === searchNisn) {
        let jamDatang = data[i][4];
        if (jamDatang && !jamDatang.includes(':')) {
          jamDatang = formatDate(new Date(jamDatang), 'Asia/Jakarta', 'HH:mm:ss');
        }
        
        let jamPulang = data[i][5] || "";
        if (jamPulang && !jamPulang.includes(':') && jamPulang !== "") {
          jamPulang = formatDate(new Date(jamPulang), 'Asia/Jakarta', 'HH:mm:ss');
        }
        
        absensiData = {
          tanggal: rowDateStr,
          jamDatang: jamDatang,
          jamPulang: jamPulang,
          status: data[i][6]
        };
        break;
      }
    }
    
    return { 
      success: true, 
      data: absensiData,
      isLibur: isLibur,
      keteranganLibur: keteranganLibur
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

async function getAbsensiList(filter = {}) {
  try {
    const data = await getSheetData('absensi');
    const absensiList = [];
    
    const fStart = filter.tanggalMulai || "";
    const fEnd = filter.tanggalAkhir || "";
    const fKelas = filter.kelas || "";
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        let rawDate = new Date(data[i][0]);
        let tanggalStr = formatDate(rawDate, 'Asia/Jakarta', 'yyyy-MM-dd');
        
        let jamDatangStr = data[i][4];
        if (jamDatangStr && !jamDatangStr.includes(':')) {
          jamDatangStr = formatDate(new Date(jamDatangStr), 'Asia/Jakarta', 'HH:mm:ss');
        }
        
        let jamPulangStr = data[i][5] || "-";
        if (jamPulangStr !== "-" && !jamPulangStr.includes(':')) {
          jamPulangStr = formatDate(new Date(jamPulangStr), 'Asia/Jakarta', 'HH:mm:ss');
        }
        
        const item = {
          tanggal: tanggalStr,
          nisn: data[i][1],
          nama: data[i][2],
          kelas: data[i][3],
          jamDatang: jamDatangStr,
          jamPulang: jamPulangStr,
          keterangan: data[i][6] || "-",
          status: data[i][7] || "-"
        };
        
        let match = true;
        if (fStart && tanggalStr < fStart) match = false;
        if (fEnd && tanggalStr > fEnd) match = false;
        if (filter.nama && !String(item.nama).toLowerCase().includes(filter.nama.toLowerCase())) match = false;
        if (fKelas && item.kelas != fKelas) match = false;
        
        if (match) {
          absensiList.push(item);
        }
      }
    }
    
    absensiList.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return { success: true, data: absensiList };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

module.exports = {
  scanAbsensi,
  getAbsensiToday,
  getAbsensiList,
  getAppConfig
};