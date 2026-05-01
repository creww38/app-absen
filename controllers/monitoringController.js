const monitoringService = require('../services/monitoringService');

async function getRealtime(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { kelas } = req.query;
  const result = await monitoringService.getRealtime(token, kelas);
  res.json(result);
}

async function updateStatus(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { nisn, nama, kelas, status } = req.body;
  const result = await monitoringService.updateStatus(token, nisn, nama, kelas, status);
  res.json(result);
}

module.exports = { getRealtime, updateStatus };
