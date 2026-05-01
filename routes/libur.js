const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const liburController = require('../controllers/liburController');

router.get('/', authenticate, authorize(['guru', 'admin']), liburController.getAll);
router.post('/', authenticate, authorize(['admin']), liburController.create);
router.delete('/:tanggal', authenticate, authorize(['admin']), liburController.delete);

module.exports = router;
