const guruService = require('../services/guruService');

async function getAll(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const result = await guruService.getAll(token);
  res.json(result);
}

async function create(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { username, password, kelas } = req.body;
  const result = await guruService.create(token, username, password, kelas);
  res.json(result);
}

async function update(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { username } = req.params;
  const { newUsername, password, kelas } = req.body;
  const result = await guruService.update(token, username, newUsername, password, kelas);
  res.json(result);
}

async function delete_(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { username } = req.params;
  const result = await guruService.delete(token, username);
  res.json(result);
}

async function bulkImport(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const result = await guruService.bulkImport(token, req.body);
  res.json(result);
}

module.exports = {
  getAll,
  create,
  update,
  delete: delete_,
  bulkImport
};
