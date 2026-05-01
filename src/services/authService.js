const jwt = require('jsonwebtoken');
const { getSheetData, appendToSheet } = require('../config/spreadsheet');
const { generateToken, getExpiryDate } = require('../utils/tokenHelper');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

async function verifySession(sessionId) {
  const data = await getSheetData(process.env.SHEET_SESSIONS || 'sessions');
  const now = new Date();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionId) {
      const expiry = new Date(data[i][3]);
      if (expiry > now) {
        return { valid: true, role: data[i][2], identifier: data[i][1] };
      } else {
        return false;
      }
    }
  }
  return false;
}

async function verifyUser(token, requiredRole = null) {
  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify session in sheet
    const sessionValid = await verifySession(decoded.sessionId);
    if (!sessionValid) {
      throw new Error("Sesi tidak valid atau sudah berakhir");
    }
    
    if (requiredRole && decoded.role !== requiredRole && decoded.role !== 'admin') {
      throw new Error("Akses Ditolak: Anda tidak memiliki izin.");
    }
    
    return { valid: true, role: decoded.role, identifier: decoded.identifier };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error("Sesi berakhir. Silakan login ulang.");
    }
    throw error;
  }
}

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
            kelas: siswaData[i][8]
          };
          break;
        }
      }
      if (!userFound) return { success: false, message: 'NISN tidak ditemukan' };
    } else {
      for (let i = 1; i < usersData.length; i++) {
        if (usersData[i][0] === username && usersData[i][1] === password) {
          userFound = {
            role: usersData[i][2],
            identifier: usersData[i][0],
            nama: usersData[i][0],
            kelas: usersData[i][3] || ""
          };
          break;
        }
      }
      if (!userFound) return { success: false, message: 'Username atau password salah' };
    }
    
    // Generate session ID
    const sessionId = generateToken();
    const expiry = getExpiryDate();
    
    // Save session to sheet
    await appendToSheet(process.env.SHEET_SESSIONS || 'sessions', [
      sessionId, 
      userFound.identifier, 
      userFound.role, 
      expiry.toISOString()
    ]);
    
    // Generate JWT
    const jwtToken = jwt.sign(
      {
        sessionId: sessionId,
        role: userFound.role,
        identifier: userFound.identifier,
        nama: userFound.nama,
        kelas: userFound.kelas
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    logger.info(`User login: ${userFound.identifier} (${userFound.role})`);
    
    return {
      success: true,
      token: jwtToken,
      role: userFound.role,
      username: userFound.identifier,
      nama: userFound.nama,
      kelas: userFound.kelas,
      nisn: (userFound.role === 'siswa') ? userFound.identifier : null
    };
  } catch (error) {
    logger.error(`Login error: ${error.toString()}`);
    return { success: false, message: "Login Error: " + error.toString() };
  }
}

async function logout(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Optional: Mark session as invalid in sheet
    logger.info(`User logout: ${decoded.identifier}`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = {
  login,
  logout,
  verifyUser,
  verifySession
};