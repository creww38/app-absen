const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const configController = require('../controllers/configController');

router.get('/', authenticate, authorize(['guru', 'admin']), configController.get);
router.put('/', authenticate, authorize(['admin']), configController.update);

module.exports = router;
