const express = require('express');
const router = express.Router();
const siswaController = require('../controllers/siswaController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, siswaController.getSiswaList);
router.get('/kelas', authenticate, siswaController.getKelasList);
router.get('/:nisn', authenticate, siswaController.getSiswaByNisn);
router.post('/', authorize(['admin']), siswaController.addSiswa);
router.put('/:nisn', authorize(['admin']), siswaController.updateSiswa);
router.delete('/:nisn', authorize(['admin']), siswaController.deleteSiswa);
router.post('/import/bulk', authorize(['admin']), siswaController.importSiswaBulk);

module.exports = router;