const express = require('express');
const router = express.Router();
const absensiController = require('../controllers/absensiController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/scan', authenticate, absensiController.scanAbsensi);
router.get('/today/:nisn', authenticate, absensiController.getAbsensiToday);
router.get('/list', authenticate, absensiController.getAbsensiList);

module.exports = router;