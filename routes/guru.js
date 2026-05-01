const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const guruController = require('../controllers/guruController');

router.get('/', authenticate, authorize(['admin']), guruController.getAll);
router.post('/', authenticate, authorize(['admin']), guruController.create);
router.put('/:username', authenticate, authorize(['admin']), guruController.update);
router.delete('/:username', authenticate, authorize(['admin']), guruController.delete);
router.post('/import/bulk', authenticate, authorize(['admin']), guruController.bulkImport);

module.exports = router;
