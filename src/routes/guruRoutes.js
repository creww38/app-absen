const express = require('express');
const router = express.Router();
const guruController = require('../controllers/guruController');
const { authorize } = require('../middleware/auth');

router.get('/', authorize(['admin']), guruController.getGuruList);
router.post('/', authorize(['admin']), guruController.addGuru);
router.put('/:username', authorize(['admin']), guruController.updateGuru);
router.delete('/:username', authorize(['admin']), guruController.deleteGuru);
router.post('/import/bulk', authorize(['admin']), guruController.importGuruBulk);

module.exports = router;