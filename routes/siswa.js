const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const siswaController = require('../controllers/siswaController');

router.get('/', authenticate, siswaController.getAll);
router.get('/kelas', authenticate, siswaController.getKelasList);
router.get('/:nisn', authenticate, siswaController.getByNisn);
router.post('/', authenticate, authorize(['admin']), siswaController.create);
router.put('/:nisn', authenticate, authorize(['admin']), siswaController.update);
router.delete('/:nisn', authenticate, authorize(['admin']), siswaController.delete);
router.post('/import/bulk', authenticate, authorize(['admin']), siswaController.bulkImport);

module.exports = router;
