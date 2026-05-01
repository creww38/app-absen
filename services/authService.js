const jwt = require('jsonwebtoken');
const { getSheetData } = require('./googleSheetsService');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

async function login(username, password, nisn) {
  try {
    const usersData = await getSheetData(process.env.SHEET_GURU || 'users');
    const siswaData = await getSheetData(process.env.SHEET_SISWA || 'siswa');
    
    let userFound = null;
    
    if (nisn) {
      for (let i = 1; i < siswaData.length; i++) {
        if (String(siswaData[i][1]) === String(nisn)) {
          userFound = {
            role: 'siswa',
            identifier: siswaData[i][1],
            nama: siswaData[i][0],
            kelas: siswaData[i][8] || '-'
          };
          break;
        }
      }
      if (!userFound) {
        return { success: false, message: 'NISN tidak ditemukan' };
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
        return { success: false, message: 'Username atau password salah' };
      }
    }
    
    const token = jwt.sign(
      {
        id: userFound.identifier,
        role: userFound.role,
        nama: userFound.nama,
        kelas: userFound.kelas
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    return {
      success: true,
      token,
      role: userFound.role,
      username: userFound.identifier,
      nama: userFound.nama,
      kelas: userFound.kelas,
      nisn: userFound.role === 'siswa' ? userFound.identifier : null
    };
    
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: error.message };
  }
}

async function logout(token) {
  return { success: true };
}

async function verify(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, user: decoded };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

async function requireRole(token, requiredRole) {
  const decoded = await verifyToken(token);
  if (!decoded) {
    throw new Error('Token tidak valid');
  }
  if (decoded.role !== requiredRole && decoded.role !== 'admin') {
    throw new Error('Akses ditolak');
  }
  return decoded;
}

module.exports = { login, logout, verify, verifyToken, requireRole };
