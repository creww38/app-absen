const liburService = require('../services/liburService');

async function getAll(req, res) {
  const result = await liburService.getAll();
  res.json(result);
}

async function create(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { tanggal, keterangan } = req.body;
  const result = await liburService.create(token, tanggal, keterangan);
  res.json(result);
}

async function delete_(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { tanggal } = req.params;
  const result = await liburService.delete(token, tanggal);
  res.json(result);
}

module.exports = { getAll, create, delete: delete_ };
