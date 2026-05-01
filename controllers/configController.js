const configService = require('../services/configService');

async function get(req, res) {
  const result = await configService.get();
  res.json(result);
}

async function update(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const result = await configService.update(token, req.body);
  res.json(result);
}

module.exports = { get, update };
