const express = require('express');
const router = express.Router();
const liburController = require('../controllers/liburController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize(['guru', 'admin']), liburController.getHariLibur);
router.post('/', authenticate, authorize(['admin']), liburController.addHariLibur);
router.put('/:tanggal', authenticate, authorize(['admin']), liburController.updateHariLibur);
router.delete('/:tanggal', authenticate, authorize(['admin']), liburController.deleteHariLibur);

module.exports = router;