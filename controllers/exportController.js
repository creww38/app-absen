const exportService = require('../services/exportService');

async function toExcel(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { type, filters } = req.body;
  const result = await exportService.generateExcel(token, type, filters);
  
  if (result.success) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);
  } else {
    res.status(500).json(result);
  }
}

module.exports = { toExcel };
