const siswaService = require('../services/siswaService');

async function getAll(req, res) {
  const result = await siswaService.getAll();
  res.json(result);
}

async function getByNisn(req, res) {
  const result = await siswaService.getByNisn(req.params.nisn);
  res.json(result);
}

async function getKelasList(req, res) {
  const result = await siswaService.getKelasList();
  res.json(result);
}

async function create(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const result = await siswaService.create(token, req.body);
  res.json(result);
}

async function update(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const result = await siswaService.update(token, req.params.nisn, req.body);
  res.json(result);
}

async function delete_(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const result = await siswaService.delete(token, req.params.nisn);
  res.json(result);
}

async function bulkImport(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const result = await siswaService.bulkImport(token, req.body);
  res.json(result);
}

module.exports = {
  getAll,
  getByNisn,
  getKelasList,
  create,
  update,
  delete: delete_,
  bulkImport
};
