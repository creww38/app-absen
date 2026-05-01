const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/excel', authenticate, authorize(['guru', 'admin']), exportController.exportExcel);

module.exports = router;