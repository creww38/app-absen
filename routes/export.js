const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const exportController = require('../controllers/exportController');

router.post('/excel', authenticate, authorize(['guru', 'admin']), exportController.toExcel);

module.exports = router;
