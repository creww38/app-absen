const monitoringService = require('../services/monitoringService');

async function getMonitoringRealtime(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const { kelas } = req.query;
  const result = await monitoringService.getMonitoringRealtime(token, kelas);
  res.json(result);
}

async function updateAbsensiStatus(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const { nisn, nama, kelas, status } = req.body;
  const result = await monitoringService.updateAbsensiStatus(token, nisn, nama, kelas, status);
  res.json(result);
}

async function getRekapBulanan(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const { bulan, tahun, kelas } = req.query;
  const result = await monitoringService.getRekapBulanan(token, bulan, tahun, kelas);
  res.json(result);
}

module.exports = {
  getMonitoringRealtime,
  updateAbsensiStatus,
  getRekapBulanan
};