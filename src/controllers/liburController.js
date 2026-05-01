const liburService = require('../services/liburService');

async function getHariLibur(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const result = await liburService.getHariLibur(token);
  res.json(result);
}

async function addHariLibur(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const { tanggal, keterangan } = req.body;
  const result = await liburService.addHariLibur(token, tanggal, keterangan);
  res.json(result);
}

async function updateHariLibur(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const { tanggal } = req.params;
  const { newTanggal, keterangan } = req.body;
  const result = await liburService.updateHariLibur(token, tanggal, newTanggal, keterangan);
  res.json(result);
}

async function deleteHariLibur(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const { tanggal } = req.params;
  const result = await liburService.deleteHariLibur(token, tanggal);
  res.json(result);
}

module.exports = {
  getHariLibur,
  addHariLibur,
  updateHariLibur,
  deleteHariLibur
};