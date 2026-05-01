const absensiService = require('../services/absensiService');

async function scanAbsensi(req, res) {
  const { nisn, scannerRole, scannerKelas } = req.body;
  const result = await absensiService.scanAbsensi(nisn, scannerRole, scannerKelas);
  res.json(result);
}

async function getAbsensiToday(req, res) {
  const { nisn } = req.params;
  const result = await absensiService.getAbsensiToday(nisn);
  res.json(result);
}

async function getAbsensiList(req, res) {
  const filters = req.query;
  const result = await absensiService.getAbsensiList(filters);
  res.json(result);
}

module.exports = {
  scanAbsensi,
  getAbsensiToday,
  getAbsensiList
};