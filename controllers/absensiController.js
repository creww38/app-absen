const absensiService = require('../services/absensiService');

async function scan(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { nisn, scannerRole, scannerKelas } = req.body;
  const result = await absensiService.scan(token, nisn, scannerRole, scannerKelas);
  res.json(result);
}

async function getToday(req, res) {
  const { nisn } = req.params;
  const result = await absensiService.getToday(nisn);
  res.json(result);
}

async function getList(req, res) {
  const filters = req.query;
  const result = await absensiService.getList(filters);
  res.json(result);
}

module.exports = { scan, getToday, getList };
