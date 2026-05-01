const guruService = require('../services/guruService');

async function getGuruList(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const result = await guruService.getGuruList(token);
  res.json(result);
}

async function addGuru(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const { username, password, kelas } = req.body;
  const result = await guruService.addGuru(token, username, password, kelas);
  res.json(result);
}

async function updateGuru(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const { username } = req.params;
  const { newUsername, password, kelas } = req.body;
  const result = await guruService.updateGuru(token, username, newUsername, password, kelas);
  res.json(result);
}

async function deleteGuru(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const { username } = req.params;
  const result = await guruService.deleteGuru(token, username);
  res.json(result);
}

async function importGuruBulk(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const result = await guruService.importGuruBulk(token, req.body.data);
  res.json(result);
}

module.exports = {
  getGuruList,
  addGuru,
  updateGuru,
  deleteGuru,
  importGuruBulk
};