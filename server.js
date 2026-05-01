require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// GOOGLE SHEETS SETUP
// ============================================
let authClient = null;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

async function getAuthClient() {
  if (authClient) return authClient;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  authClient = new google.auth.JWT(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return authClient;
}

async function getSheets() {
  const auth = await getAuthClient();
  return google.sheets({ version: 'v4', auth });
}

async function getSheetData(sheetName) {
  try {
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });
    return response.data.values || [];
  } catch (error) {
    console.error(`Error reading ${sheetName}:`, error.message);
    return [];
  }
}

async function appendToSheet(sheetName, values) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [values] },
  });
}

async function updateSheetCell(sheetName, row, column, value) {
  const sheets = await getSheets();
  const colLetter = String.fromCharCode(64 + column);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${colLetter}${row}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [[value]] },
  });
}

async function deleteSheetRow(sheetName, rowIndex) {
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    includeGridData: false,
  });
  
  const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} not found`);
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex
          }
        }
      }]
    }
  });
}

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Terlalu banyak permintaan' }
});
app.use('/api/', limiter);

// Auth middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token tidak valid' });
  }
}

function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (roles.length > 0 && !roles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    next();
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatDateToYMD(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function getCurrentHourMin() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return (hours * 60) + minutes;
}

function isLate(currentTime, limitTime) {
  return timeToMinutes(currentTime) > timeToMinutes(limitTime);
}

function getLateMinutes(currentTime, limitTime) {
  const diff = timeToMinutes(currentTime) - timeToMinutes(limitTime);
  return diff > 0 ? diff : 0;
}

function isEarly(currentTime, limitTime) {
  return timeToMinutes(currentTime) < timeToMinutes(limitTime);
}

// ============================================
// GET CONFIG FROM SHEET
// ============================================
async function getAppConfig() {
  const configData = await getSheetData(process.env.SHEET_KONFIGURASI || 'konfigurasi');
  let config = {
    jam_masuk_mulai: '06:00',
    jam_masuk_akhir: '07:15',
    jam_pulang_mulai: '15:00',
    jam_pulang_akhir: '17:00'
  };
  
  for (let i = 1; i < configData.length; i++) {
    const key = configData[i][0];
    const val = configData[i][1];
    if (config.hasOwnProperty(key)) {
      config[key] = String(val || '').trim();
    }
  }
  return config;
}

async function getKelasByNisn(nisn) {
  const siswaData = await getSheetData(process.env.SHEET_SISWA || 'siswa');
  for (let i = 1; i < siswaData.length; i++) {
    const studentNisn = String(siswaData[i][1] || '').replace(/^'/, '').trim();
    if (studentNisn === String(nisn).trim()) {
      return siswaData[i][8] || '-';
    }
  }
  return '-';
}

// ============================================
// AUTH ENDPOINTS
// ============================================

app.post('/api/auth/login', async (req, res) => {
  console.log('Login request:', req.body);
  
  try {
    const { username, password, nisn } = req.body;
    
    const usersData = await getSheetData(process.env.SHEET_GURU || 'users');
    const siswaData = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    
    let userFound = null;
    
    if (nisn) {
      const searchNisn = String(nisn).trim();
      for (let i = 1; i < siswaData.length; i++) {
        const studentNisn = String(siswaData[i][1] || '').replace(/^'/, '').trim();
        if (studentNisn === searchNisn) {
          userFound = {
            role: 'siswa',
            identifier: studentNisn,
            nama: siswaData[i][0],
            kelas: siswaData[i][8] || '-'
          };
          break;
        }
      }
      if (!userFound) {
        return res.json({ success: false, message: `NISN "${nisn}" tidak ditemukan` });
      }
    } else {
      for (let i = 1; i < usersData.length; i++) {
        if (usersData[i][0] === username && usersData[i][1] === password) {
          userFound = {
            role: usersData[i][2],
            identifier: usersData[i][0],
            nama: usersData[i][0],
            kelas: usersData[i][3] || ''
          };
          break;
        }
      }
      if (!userFound) {
        return res.json({ success: false, message: 'Username atau password salah' });
      }
    }
    
    const token = jwt.sign(
      {
        id: userFound.identifier,
        role: userFound.role,
        nama: userFound.nama,
        kelas: userFound.kelas
      },
      process.env.JWT_SECRET || 'secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      role: userFound.role,
      username: userFound.identifier,
      nama: userFound.nama,
      kelas: userFound.kelas,
      nisn: userFound.role === 'siswa' ? userFound.identifier : null
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.json({ success: false, message: error.message });
  }
});

app.get('/api/auth/verify', authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logout berhasil' });
});

// ============================================
// DEBUG ENDPOINT
// ============================================
app.get('/api/debug/time', (req, res) => {
  const now = new Date();
  res.json({
    serverTime: now.toString(),
    serverHourMin: getCurrentHourMin(),
    serverFullTime: getCurrentTime(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
});

// ============================================
// SISWA ENDPOINTS
// ============================================

app.get('/api/siswa', async (req, res) => {
  try {
    const data = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    const siswaList = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        siswaList.push({
          nama: data[i][0],
          nisn: String(data[i][1] || '').replace(/^'/, ''),
          jenisKelamin: data[i][2] || '',
          tanggalLahir: data[i][3] || '',
          agama: data[i][4] || '',
          namaAyah: data[i][5] || '',
          namaIbu: data[i][6] || '',
          noHp: data[i][7] || '',
          kelas: data[i][8] || '',
          alamat: data[i][9] || ''
        });
      }
    }
    
    res.json({ success: true, data: siswaList, total: siswaList.length });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.get('/api/siswa/:nisn', async (req, res) => {
  try {
    const data = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    const nisn = req.params.nisn;
    
    for (let i = 1; i < data.length; i++) {
      const studentNisn = String(data[i][1] || '').replace(/^'/, '').trim();
      if (studentNisn === String(nisn).trim()) {
        return res.json({
          success: true,
          data: {
            nama: data[i][0],
            nisn: studentNisn,
            jenisKelamin: data[i][2] || '',
            tanggalLahir: data[i][3] || '',
            agama: data[i][4] || '',
            namaAyah: data[i][5] || '',
            namaIbu: data[i][6] || '',
            noHp: data[i][7] || '',
            kelas: data[i][8] || '',
            alamat: data[i][9] || ''
          }
        });
      }
    }
    
    res.json({ success: false, message: 'Siswa tidak ditemukan' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.post('/api/siswa', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const siswaData = req.body;
    
    const existingData = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    for (let i = 1; i < existingData.length; i++) {
      const existingNisn = String(existingData[i][1] || '').replace(/^'/, '').trim();
      if (existingNisn === String(siswaData.nisn).trim()) {
        return res.json({ success: false, message: 'NISN sudah terdaftar' });
      }
    }
    
    await appendToSheet(process.env.SHEET_SISWA || 'siswa', [
      siswaData.nama,
      siswaData.nisn,
      siswaData.jenisKelamin || '',
      siswaData.tanggalLahir || '',
      siswaData.agama || '',
      siswaData.namaAyah || '',
      siswaData.namaIbu || '',
      siswaData.noHp || '',
      siswaData.kelas || '',
      siswaData.alamat || ''
    ]);
    
    res.json({ success: true, message: 'Siswa berhasil ditambahkan' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.put('/api/siswa/:nisn', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const oldNisn = req.params.nisn;
    const siswaData = req.body;
    
    const data = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    
    for (let i = 1; i < data.length; i++) {
      const currentNisn = String(data[i][1] || '').replace(/^'/, '').trim();
      if (currentNisn === String(oldNisn).trim()) {
        const row = i + 1;
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 1, siswaData.nama);
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 2, siswaData.nisn);
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 3, siswaData.jenisKelamin || '');
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 4, siswaData.tanggalLahir || '');
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 5, siswaData.agama || '');
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 6, siswaData.namaAyah || '');
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 7, siswaData.namaIbu || '');
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 8, siswaData.noHp || '');
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 9, siswaData.kelas || '');
        await updateSheetCell(process.env.SHEET_SISWA || 'siswa', row, 10, siswaData.alamat || '');
        
        return res.json({ success: true, message: 'Siswa berhasil diupdate' });
      }
    }
    
    res.json({ success: false, message: 'Siswa tidak ditemukan' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.delete('/api/siswa/:nisn', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const nisn = req.params.nisn;
    const data = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    
    for (let i = 1; i < data.length; i++) {
      const currentNisn = String(data[i][1] || '').replace(/^'/, '').trim();
      if (currentNisn === String(nisn).trim()) {
        await deleteSheetRow(process.env.SHEET_SISWA || 'siswa', i + 1);
        return res.json({ success: true, message: 'Siswa berhasil dihapus' });
      }
    }
    
    res.json({ success: false, message: 'Siswa tidak ditemukan' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.get('/api/siswa/kelas', async (req, res) => {
  try {
    const data = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    const kelasSet = new Set();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][8]) {
        kelasSet.add(data[i][8]);
      }
    }
    
    res.json({ success: true, data: Array.from(kelasSet).sort() });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ============================================
// GURU ENDPOINTS
// ============================================

app.get('/api/guru', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const data = await getSheetData(process.env.SHEET_GURU || 'users');
    const guruList = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === 'guru') {
        guruList.push({
          username: data[i][0],
          password: data[i][1],
          role: data[i][2],
          kelas: data[i][3] || ''
        });
      }
    }
    
    res.json({ success: true, data: guruList });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.post('/api/guru', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { username, password, kelas } = req.body;
    
    const existingData = await getSheetData(process.env.SHEET_GURU || 'users');
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][0] === username) {
        return res.json({ success: false, message: 'Username sudah terdaftar' });
      }
    }
    
    await appendToSheet(process.env.SHEET_GURU || 'users', [username, password, 'guru', kelas || '']);
    res.json({ success: true, message: 'Guru berhasil ditambahkan' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.put('/api/guru/:username', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const oldUsername = req.params.username;
    const { newUsername, password, kelas } = req.body;
    
    const data = await getSheetData(process.env.SHEET_GURU || 'users');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === oldUsername && data[i][2] === 'guru') {
        const row = i + 1;
        await updateSheetCell(process.env.SHEET_GURU || 'users', row, 1, newUsername);
        await updateSheetCell(process.env.SHEET_GURU || 'users', row, 2, password);
        await updateSheetCell(process.env.SHEET_GURU || 'users', row, 4, kelas || '');
        return res.json({ success: true, message: 'Guru berhasil diupdate' });
      }
    }
    
    res.json({ success: false, message: 'Guru tidak ditemukan' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.delete('/api/guru/:username', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const username = req.params.username;
    const data = await getSheetData(process.env.SHEET_GURU || 'users');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === username && data[i][2] === 'guru') {
        await deleteSheetRow(process.env.SHEET_GURU || 'users', i + 1);
        return res.json({ success: true, message: 'Guru berhasil dihapus' });
      }
    }
    
    res.json({ success: false, message: 'Guru tidak ditemukan' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ============================================
// ABSENSI ENDPOINTS
// ============================================

app.post('/api/absensi/scan', authenticate, async (req, res) => {
  try {
    const { nisn, scannerRole, scannerKelas } = req.body;
    const today = new Date();
    const todayStr = formatDateToYMD(today);
    const nowTime = getCurrentTime();
    const nowHourMin = getCurrentHourMin();
    
    console.log(`\n========== SCAN ABSENSI ==========`);
    console.log(`[TIME] Current: ${nowHourMin}`);
    console.log(`[DATA] NISN: ${nisn}, Role: ${scannerRole}`);
    
    // 1. Baca konfigurasi
    const config = await getAppConfig();
    console.log(`[CONFIG] Batas Terlambat: ${config.jam_masuk_akhir}`);
    
    // 2. Cek hari libur
    const liburData = await getSheetData(process.env.SHEET_LIBUR || 'libur');
    for (let i = 1; i < liburData.length; i++) {
      let tglLibur = liburData[i][0];
      if (tglLibur instanceof Date) tglLibur = formatDateToYMD(tglLibur);
      if (tglLibur === todayStr) {
        return res.json({ success: false, message: `Absensi DITUTUP. Hari ini libur.` });
      }
    }
    
    // 3. Cari data siswa
    const siswaData = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    let siswa = null;
    
    for (let i = 1; i < siswaData.length; i++) {
      const studentNisn = String(siswaData[i][1] || '').replace(/^'/, '').trim();
      if (studentNisn === String(nisn).trim()) {
        siswa = {
          nama: siswaData[i][0],
          nisn: studentNisn,
          kelas: siswaData[i][8] || '-'
        };
        break;
      }
    }
    
    if (!siswa) {
      return res.json({ success: false, message: 'NISN tidak terdaftar' });
    }
    
    // 4. CEK IZIN/SAKIT
    const izinData = await getSheetData(process.env.SHEET_IZIN || 'izin');
    for (let i = 1; i < izinData.length; i++) {
      const rowNisn = String(izinData[i][1] || '').replace(/^'/, '').trim();
      const tglMulai = izinData[i][2];
      const tglAkhir = izinData[i][3];
      const status = izinData[i][6];
      
      if (rowNisn === siswa.nisn && status === 'disetujui') {
        const startDate = new Date(tglMulai);
        const endDate = new Date(tglAkhir);
        if (today >= startDate && today <= endDate) {
          const jenis = izinData[i][4];
          const keterangan = izinData[i][5] || '';
          return res.json({ 
            success: false, 
            message: jenis === 'sakit' 
              ? `Anda sedang sakit (${keterangan}). Tidak perlu absen.` 
              : `Anda sedang izin (${keterangan}). Tidak perlu absen.` 
          });
        }
      }
    }
    
    // 5. Validasi kelas untuk guru
    if (scannerRole === 'guru' && scannerKelas && siswa.kelas !== scannerKelas) {
      return res.json({ success: false, message: `Ditolak! Siswa ini kelas ${siswa.kelas}.` });
    }
    
    // 6. Cek absensi hari ini
    const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
    let existingRecord = null;
    let existingRow = -1;
    
    for (let i = 1; i < absensiData.length; i++) {
      if (!absensiData[i][0]) continue;
      let rowDateStr = absensiData[i][0] instanceof Date 
        ? formatDateToYMD(absensiData[i][0]) 
        : absensiData[i][0].split('T')[0];
      const rowNisn = String(absensiData[i][1] || '').replace(/^'/, '').trim();
      
      if (rowDateStr === todayStr && rowNisn === siswa.nisn) {
        existingRecord = absensiData[i];
        existingRow = i + 1;
        break;
      }
    }
    
    // 7. Proses absen
    if (!existingRecord) {
      // ABSEN DATANG
      const isTerlambat = isLate(nowHourMin, config.jam_masuk_akhir);
      const keteranganWaktu = isTerlambat 
        ? `Terlambat (${getLateMinutes(nowHourMin, config.jam_masuk_akhir)} menit)` 
        : 'Tepat Waktu';
      
      await appendToSheet(process.env.SHEET_ABSENSI || 'absensi', [
        today.toISOString(), siswa.nisn, siswa.nama, siswa.kelas,
        nowTime, '', keteranganWaktu, 'Hadir'
      ]);
      
      return res.json({
        success: true,
        type: 'datang',
        message: isTerlambat ? `Absen Masuk (${keteranganWaktu})` : 'Absen Masuk Berhasil',
        jamDatang: nowTime,
        keterangan: keteranganWaktu,
        nama: siswa.nama,
        kelas: siswa.kelas
      });
      
    } else {
      // ABSEN PULANG
      if (existingRecord[5] && existingRecord[5] !== '') {
        return res.json({ success: false, message: 'Sudah absen pulang hari ini.' });
      }
      
      if (isLate(nowHourMin, config.jam_pulang_akhir)) {
        return res.json({ success: false, message: `Batas pulang (${config.jam_pulang_akhir}) sudah lewat.` });
      }
      
      let keteranganBaru = existingRecord[6] || '';
      let pesanPulang = 'Absen Pulang Berhasil';
      
      if (isEarly(nowHourMin, config.jam_pulang_mulai)) {
        keteranganBaru = keteranganBaru.includes('Terlambat') 
          ? keteranganBaru + ' & Pulang Cepat' 
          : 'Pulang Cepat';
        pesanPulang = 'Absen Pulang (Pulang Cepat)';
      }
      
      await updateSheetCell(process.env.SHEET_ABSENSI || 'absensi', existingRow, 6, nowTime);
      await updateSheetCell(process.env.SHEET_ABSENSI || 'absensi', existingRow, 7, keteranganBaru);
      
      return res.json({
        success: true,
        type: 'pulang',
        message: pesanPulang,
        jamPulang: nowTime,
        nama: siswa.nama,
        kelas: siswa.kelas
      });
    }
    
  } catch (error) {
    console.error('[SCAN] Error:', error);
    res.json({ success: false, message: error.message });
  }
});

app.get('/api/absensi/today/:nisn', authenticate, async (req, res) => {
  try {
    const todayStr = formatDateToYMD(new Date());
    const nisn = req.params.nisn;
    const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
    
    for (let i = 1; i < absensiData.length; i++) {
      if (!absensiData[i][0]) continue;
      let rowDateStr = absensiData[i][0] instanceof Date 
        ? formatDateToYMD(absensiData[i][0]) 
        : absensiData[i][0].split('T')[0];
      const rowNisn = String(absensiData[i][1] || '').replace(/^'/, '').trim();
      
      if (rowDateStr === todayStr && rowNisn === String(nisn).trim()) {
        return res.json({
          success: true,
          data: {
            tanggal: rowDateStr,
            jamDatang: absensiData[i][4],
            jamPulang: absensiData[i][5],
            keterangan: absensiData[i][6],
            status: absensiData[i][7]
          }
        });
      }
    }
    
    res.json({ success: true, data: null });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.get('/api/absensi/list', authenticate, async (req, res) => {
  try {
    const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
    const result = [];
    
    for (let i = 1; i < absensiData.length; i++) {
      if (absensiData[i][0]) {
        let tanggal = absensiData[i][0];
        if (tanggal instanceof Date) tanggal = formatDateToYMD(tanggal);
        result.push({
          tanggal: tanggal,
          nisn: String(absensiData[i][1] || '').replace(/^'/, ''),
          nama: absensiData[i][2] || '',
          kelas: absensiData[i][3] || '',
          jamDatang: absensiData[i][4] || '-',
          jamPulang: absensiData[i][5] || '-',
          keterangan: absensiData[i][6] || '-',
          status: absensiData[i][7] || '-'
        });
      }
    }
    
    result.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ============================================
// IZIN & SAKIT ENDPOINTS
// ============================================

app.post('/api/izin/create', authenticate, authorize(['siswa']), async (req, res) => {
  try {
    const { jenis, keterangan, tanggalMulai, tanggalAkhir } = req.body;
    const nisn = req.user.id;
    
    if (jenis !== 'izin' && jenis !== 'sakit') {
      return res.json({ success: false, message: 'Jenis harus "izin" atau "sakit"' });
    }
    
    const izinData = await getSheetData(process.env.SHEET_IZIN || 'izin');
    for (let i = 1; i < izinData.length; i++) {
      const existingNisn = String(izinData[i][1] || '').replace(/^'/, '').trim();
      if (existingNisn === nisn && izinData[i][2] === tanggalMulai) {
        return res.json({ success: false, message: 'Sudah ada pengajuan untuk tanggal tersebut' });
      }
    }
    
    await appendToSheet(process.env.SHEET_IZIN || 'izin', [
      new Date().toISOString(), nisn, tanggalMulai, tanggalAkhir,
      jenis, keterangan || '', 'pending', req.user.nama
    ]);
    
    res.json({ success: true, message: `Pengajuan ${jenis} berhasil, menunggu persetujuan.` });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.get('/api/izin/list', authenticate, authorize(['guru', 'admin']), async (req, res) => {
  try {
    const izinData = await getSheetData(process.env.SHEET_IZIN || 'izin');
    const result = [];
    
    for (let i = 1; i < izinData.length; i++) {
      if (izinData[i][0]) {
        result.push({
          id: i,
          tanggalPengajuan: izinData[i][0],
          nisn: String(izinData[i][1] || '').replace(/^'/, ''),
          tanggalMulai: izinData[i][2],
          tanggalAkhir: izinData[i][3],
          jenis: izinData[i][4],
          keterangan: izinData[i][5] || '',
          status: izinData[i][6] || 'pending',
          pengaju: izinData[i][7] || ''
        });
      }
    }
    
    // Filter untuk guru berdasarkan kelas
    if (req.user.role === 'guru' && req.user.kelas) {
      const siswaData = await getSheetData(process.env.SHEET_SISWA || 'siswa');
      const siswaNisnList = [];
      for (let i = 1; i < siswaData.length; i++) {
        if (siswaData[i][8] === req.user.kelas) {
          siswaNisnList.push(String(siswaData[i][1] || '').replace(/^'/, '').trim());
        }
      }
      const filtered = result.filter(item => siswaNisnList.includes(item.nisn));
      filtered.sort((a, b) => new Date(b.tanggalPengajuan) - new Date(a.tanggalPengajuan));
      return res.json({ success: true, data: filtered });
    }
    
    result.sort((a, b) => new Date(b.tanggalPengajuan) - new Date(a.tanggalPengajuan));
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.get('/api/izin/my', authenticate, authorize(['siswa']), async (req, res) => {
  try {
    const nisn = req.user.id;
    const izinData = await getSheetData(process.env.SHEET_IZIN || 'izin');
    const result = [];
    
    for (let i = 1; i < izinData.length; i++) {
      if (izinData[i][0]) {
        const rowNisn = String(izinData[i][1] || '').replace(/^'/, '').trim();
        if (rowNisn === nisn) {
          result.push({
            id: i,
            tanggalPengajuan: izinData[i][0],
            tanggalMulai: izinData[i][2],
            tanggalAkhir: izinData[i][3],
            jenis: izinData[i][4],
            keterangan: izinData[i][5] || '',
            status: izinData[i][6] || 'pending'
          });
        }
      }
    }
    
    result.sort((a, b) => new Date(b.tanggalPengajuan) - new Date(a.tanggalPengajuan));
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.put('/api/izin/:id/approve', authenticate, authorize(['guru', 'admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rowIndex = id + 1;
    
    await updateSheetCell(process.env.SHEET_IZIN || 'izin', rowIndex, 7, 'disetujui');
    
    // Auto absen untuk tanggal yang diajukan
    const izinData = await getSheetData(process.env.SHEET_IZIN || 'izin');
    const item = izinData[id];
    
    if (item) {
      const nisn = String(item[1] || '').replace(/^'/, '');
      const nama = item[7] || '';
      const kelas = await getKelasByNisn(nisn);
      const jenis = item[4];
      const tglMulai = item[2];
      const tglAkhir = item[3];
      const keterangan = item[5] || '';
      
      const absensiStatus = jenis === 'izin' ? 'Izin' : 'Sakit';
      const absensiKeterangan = `${jenis === 'izin' ? 'Izin' : 'Sakit'}: ${keterangan}`;
      
      const startDate = new Date(tglMulai);
      const endDate = new Date(tglAkhir);
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const tanggalStr = formatDateToYMD(currentDate);
        const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
        let exists = false;
        
        for (let i = 1; i < absensiData.length; i++) {
          if (!absensiData[i][0]) continue;
          let rowDate = absensiData[i][0];
          if (rowDate instanceof Date) rowDate = formatDateToYMD(rowDate);
          const rowNisn = String(absensiData[i][1] || '').replace(/^'/, '').trim();
          if (rowDate === tanggalStr && rowNisn === nisn) {
            exists = true;
            break;
          }
        }
        
        if (!exists) {
          await appendToSheet(process.env.SHEET_ABSENSI || 'absensi', [
            currentDate.toISOString(), nisn, nama, kelas,
            '-', '-', absensiKeterangan, absensiStatus
          ]);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    res.json({ success: true, message: 'Pengajuan disetujui' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.put('/api/izin/:id/reject', authenticate, authorize(['guru', 'admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rowIndex = id + 1;
    await updateSheetCell(process.env.SHEET_IZIN || 'izin', rowIndex, 7, 'ditolak');
    res.json({ success: true, message: 'Pengajuan ditolak' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ============================================
// MONITORING ENDPOINTS
// ============================================

app.get('/api/monitoring/realtime', authenticate, async (req, res) => {
  try {
    const todayStr = formatDateToYMD(new Date());
    const siswaData = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
    
    const absensiMap = {};
    for (let i = 1; i < absensiData.length; i++) {
      if (!absensiData[i][0]) continue;
      let rowDateStr = absensiData[i][0] instanceof Date 
        ? formatDateToYMD(absensiData[i][0]) 
        : absensiData[i][0].split('T')[0];
      const nisn = String(absensiData[i][1] || '').replace(/^'/, '').trim();
      
      if (rowDateStr === todayStr) {
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
      const nisn = String(siswaData[i][1] || '').replace(/^'/, '').trim();
      const kelas = siswaData[i][8] || '-';
      
      if (req.query.kelas && kelas !== req.query.kelas) continue;
      
      const info = absensiMap[nisn] || {
        jamDatang: '-', jamPulang: '-', keterangan: '-', status: 'Belum Absen'
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
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.put('/api/monitoring/status', authenticate, authorize(['guru', 'admin']), async (req, res) => {
  try {
    const { nisn, nama, kelas, status } = req.body;
    const todayStr = formatDateToYMD(new Date());
    const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
    
    let found = false, rowIndex = -1;
    
    for (let i = 1; i < absensiData.length; i++) {
      if (!absensiData[i][0]) continue;
      let rowDateStr = absensiData[i][0] instanceof Date 
        ? formatDateToYMD(absensiData[i][0]) 
        : absensiData[i][0].split('T')[0];
      const rowNisn = String(absensiData[i][1] || '').replace(/^'/, '').trim();
      
      if (rowDateStr === todayStr && rowNisn === String(nisn).trim()) {
        found = true;
        rowIndex = i + 1;
        break;
      }
    }
    
    if (found) {
      await updateSheetCell(process.env.SHEET_ABSENSI || 'absensi', rowIndex, 8, status);
    } else {
      await appendToSheet(process.env.SHEET_ABSENSI || 'absensi', [
        new Date().toISOString(), nisn, nama, kelas, '-', '-', '-', status
      ]);
    }
    
    res.json({ success: true, message: 'Status berhasil diubah' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ============================================
// CONFIG ENDPOINTS
// ============================================

app.get('/api/config', authenticate, async (req, res) => {
  try {
    const config = await getAppConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.put('/api/config', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const newConfig = req.body;
    const data = await getSheetData(process.env.SHEET_KONFIGURASI || 'konfigurasi');
    
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      if (newConfig[key]) {
        await updateSheetCell(process.env.SHEET_KONFIGURASI || 'konfigurasi', i + 1, 2, newConfig[key]);
      }
    }
    
    res.json({ success: true, message: 'Konfigurasi berhasil disimpan' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ============================================
// LIBUR ENDPOINTS (SEDERHANA)
// ============================================

app.get('/api/libur', authenticate, async (req, res) => {
  try {
    const data = await getSheetData(process.env.SHEET_LIBUR || 'libur');
    const list = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        list.push({
          tanggal: data[i][0] instanceof Date ? formatDateToYMD(data[i][0]) : data[i][0],
          keterangan: data[i][1] || ''
        });
      }
    }
    list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    res.json({ success: true, data: list });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.post('/api/libur', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { tanggal, keterangan } = req.body;
    await appendToSheet(process.env.SHEET_LIBUR || 'libur', [tanggal, keterangan]);
    res.json({ success: true, message: 'Hari libur ditambahkan' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.delete('/api/libur/:tanggal', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const tanggal = req.params.tanggal;
    const data = await getSheetData(process.env.SHEET_LIBUR || 'libur');
    for (let i = 1; i < data.length; i++) {
      let rowDate = data[i][0];
      if (rowDate instanceof Date) rowDate = formatDateToYMD(rowDate);
      if (rowDate === tanggal) {
        await deleteSheetRow(process.env.SHEET_LIBUR || 'libur', i + 1);
        return res.json({ success: true, message: 'Hari libur dihapus' });
      }
    }
    res.json({ success: false, message: 'Data tidak ditemukan' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ============================================
// EXPORT ENDPOINT (SEDERHANA)
// ============================================

app.post('/api/export/excel', authenticate, authorize(['guru', 'admin']), async (req, res) => {
  try {
    const Excel = require('exceljs');
    const { type } = req.body;
    
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Laporan');
    
    let headers = [], data = [];
    
    if (type === 'absensi') {
      headers = ['No', 'Tanggal', 'NISN', 'Nama', 'Kelas', 'Jam Datang', 'Jam Pulang', 'Keterangan', 'Status'];
      const absensiData = await getSheetData(process.env.SHEET_ABSENSI || 'absensi');
      let no = 1;
      for (let i = 1; i < absensiData.length; i++) {
        if (absensiData[i][0]) {
          let tanggal = absensiData[i][0];
          if (tanggal instanceof Date) tanggal = formatDateToYMD(tanggal);
          data.push([no++, tanggal, absensiData[i][1], absensiData[i][2], 
            absensiData[i][3], absensiData[i][4] || '-', absensiData[i][5] || '-',
            absensiData[i][6] || '-', absensiData[i][7] || '-']);
        }
      }
    }
    
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });
    
    data.forEach(row => worksheet.addRow(row));
    worksheet.columns.forEach(col => { col.width = 15; });
    
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="laporan_${formatDateToYMD(new Date())}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// SETUP INITIAL DATA
// ============================================

app.post('/api/setup', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const sheets = [
      { name: process.env.SHEET_SISWA || 'siswa', headers: ['Nama Lengkap', 'NISN', 'Jenis Kelamin', 'Tanggal Lahir', 'Agama', 'Nama Ayah', 'Nama Ibu', 'No Handphone', 'Kelas', 'Alamat'] },
      { name: process.env.SHEET_GURU || 'users', headers: ['Username', 'Password', 'Role', 'Kelas'] },
      { name: process.env.SHEET_ABSENSI || 'absensi', headers: ['Tanggal', 'NISN', 'Nama', 'Kelas', 'Jam Datang', 'Jam Pulang', 'Keterangan Waktu', 'Status'] },
      { name: process.env.SHEET_KONFIGURASI || 'konfigurasi', headers: ['Key', 'Value', 'Keterangan'] },
      { name: process.env.SHEET_LIBUR || 'libur', headers: ['Tanggal', 'Keterangan'] },
      { name: process.env.SHEET_IZIN || 'izin', headers: ['Tanggal Pengajuan', 'NISN', 'Tanggal Mulai', 'Tanggal Akhir', 'Jenis', 'Keterangan', 'Status', 'Nama Pengaju'] }
    ];
    
    for (const sheet of sheets) {
      const data = await getSheetData(sheet.name);
      if (data.length === 0) {
        await appendToSheet(sheet.name, sheet.headers);
        console.log(`[SETUP] Created sheet: ${sheet.name}`);
      }
    }
    
    // Add default admin if users sheet empty
    const usersData = await getSheetData(process.env.SHEET_GURU || 'users');
    if (usersData.length === 1) {
      await appendToSheet(process.env.SHEET_GURU || 'users', ['admin', 'admin123', 'admin', '']);
      await appendToSheet(process.env.SHEET_GURU || 'users', ['guru1', 'guru123', 'guru', 'VI B']);
    }
    
    // Add default config
    const configData = await getSheetData(process.env.SHEET_KONFIGURASI || 'konfigurasi');
    if (configData.length === 1) {
      await appendToSheet(process.env.SHEET_KONFIGURASI || 'konfigurasi', ['jam_masuk_mulai', '06:00', '']);
      await appendToSheet(process.env.SHEET_KONFIGURASI || 'konfigurasi', ['jam_masuk_akhir', '07:15', '']);
      await appendToSheet(process.env.SHEET_KONFIGURASI || 'konfigurasi', ['jam_pulang_mulai', '15:00', '']);
      await appendToSheet(process.env.SHEET_KONFIGURASI || 'konfigurasi', ['jam_pulang_akhir', '17:00', '']);
    }
    
    res.json({ success: true, message: 'Setup database berhasil' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// ============================================
// HEALTH & 404
// ============================================

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date(), environment: process.env.NODE_ENV });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Endpoint tidak ditemukan: ${req.method} ${req.url}` });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({ success: false, message: err.message });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 SERVER ABSENSI SEKOLAH`);
  console.log(`========================================`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================\n`);
  console.log(`📋 ENDPOINTS TERSEDIA:\n`);
  console.log(`🔐 AUTH: /api/auth/login, /api/auth/verify`);
  console.log(`👨‍🎓 SISWA: /api/siswa, /api/siswa/:nisn`);
  console.log(`👨‍🏫 GURU: /api/guru (Admin only)`);
  console.log(`📝 ABSENSI: /api/absensi/scan, /api/absensi/today/:nisn`);
  console.log(`📊 MONITORING: /api/monitoring/realtime`);
  console.log(`📅 IZIN/SAKIT: /api/izin/create, /api/izin/list, /api/izin/approve/:id`);
  console.log(`⚙️ CONFIG: /api/config`);
  console.log(`🛠️ SETUP: /api/setup (Admin)`);
  console.log(`========================================`);
  console.log(`💡 TEST: username="admin", password="admin123"`);
  console.log(`========================================\n`);
});