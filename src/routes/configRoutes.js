const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize(['guru', 'admin']), configController.getAppConfig);
router.put('/', authenticate, authorize(['admin']), configController.saveAppConfig);
router.post('/setup', authenticate, authorize(['admin']), configController.setupInitialData);

module.exports = router;