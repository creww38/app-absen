const authService = require('../services/authService');

async function login(req, res) {
  const { username, password, nisn } = req.body;
  const result = await authService.login(username, password, nisn);
  res.json(result);
}

async function logout(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const result = await authService.logout(token);
  res.json(result);
}

async function verify(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const result = await authService.verify(token);
  res.json(result);
}

module.exports = { login, logout, verify };
