const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const absensiController = require('../controllers/absensiController');

router.post('/scan', authenticate, absensiController.scan);
router.get('/today/:nisn', authenticate, absensiController.getToday);
router.get('/list', authenticate, absensiController.getList);

module.exports = router;
