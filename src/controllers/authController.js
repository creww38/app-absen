const authService = require('../services/authService');
const logger = require('../utils/logger');

async function login(req, res) {
  const { username, password, nisn } = req.body;
  
  // Log attempt (without sensitive data)
  logger.info(`Login attempt: ${username || nisn}`);
  
  const result = await authService.login(username, password, nisn);
  
  if (result.success && req.session) {
    req.session.token = result.token;
    req.session.role = result.role;
  }
  
  res.json(result);
}

async function logout(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const result = await authService.logout(token);
  
  if (req.session) {
    req.session.destroy();
  }
  
  res.json(result);
}

async function verify(req, res) {
  res.json({ 
    success: true, 
    user: req.user,
    message: 'Token valid'
  });
}

module.exports = {
  login,
  logout,
  verify
};