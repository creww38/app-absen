const jwt = require('jsonwebtoken');
const { verifySession } = require('../services/authService');

const JWT_SECRET = process.env.JWT_SECRET;

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
  }
  
  try {
    // Verifikasi JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verifikasi session di Google Sheets
    const isValid = await verifySession(decoded.sessionId);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Session tidak valid' });
    }
    
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token tidak valid' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token sudah kadaluarsa' });
    }
    return res.status(401).json({ success: false, message: error.message });
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

module.exports = {
  authenticate,
  authorize
};