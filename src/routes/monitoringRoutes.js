const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/realtime', authenticate, authorize(['guru', 'admin']), monitoringController.getMonitoringRealtime);
router.put('/status', authenticate, authorize(['guru', 'admin']), monitoringController.updateAbsensiStatus);
router.get('/rekap', authenticate, authorize(['guru', 'admin']), monitoringController.getRekapBulanan);

module.exports = router;