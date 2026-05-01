const siswaService = require('../services/siswaService');

async function getSiswaList(req, res) {
  const result = await siswaService.getSiswaList();
  res.json(result);
}

async function getSiswaByNisn(req, res) {
  const { nisn } = req.params;
  const result = await siswaService.getSiswaByNisn(nisn);
  res.json(result);
}

async function addSiswa(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const result = await siswaService.addSiswa(token, req.body);
  res.json(result);
}

async function updateSiswa(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const { nisn } = req.params;
  const result = await siswaService.updateSiswa(token, nisn, req.body);
  res.json(result);
}

async function deleteSiswa(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const { nisn } = req.params;
  const result = await siswaService.deleteSiswa(token, nisn);
  res.json(result);
}

async function getKelasList(req, res) {
  const result = await siswaService.getKelasList();
  res.json(result);
}

async function importSiswaBulk(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const result = await siswaService.importSiswaBulk(token, req.body.data);
  res.json(result);
}

module.exports = {
  getSiswaList,
  getSiswaByNisn,
  addSiswa,
  updateSiswa,
  deleteSiswa,
  getKelasList,
  importSiswaBulk
};