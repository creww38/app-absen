const configService = require('../services/configService');

async function getAppConfig(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const result = await configService.getAppConfig(token);
  res.json(result);
}

async function saveAppConfig(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const result = await configService.saveAppConfig(token, req.body);
  res.json(result);
}

async function setupInitialData(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.session?.token;
  const result = await configService.setupInitialData(token);
  res.json(result);
}

module.exports = {
  getAppConfig,
  saveAppConfig,
  setupInitialData
};