const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const monitoringController = require('../controllers/monitoringController');

router.get('/realtime', authenticate, authorize(['guru', 'admin']), monitoringController.getRealtime);
router.put('/status', authenticate, authorize(['guru', 'admin']), monitoringController.updateStatus);

module.exports = router;
