const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { strictLimiter } = require('../middleware/rateLimit');

router.post('/login', strictLimiter, authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/verify', authenticate, authController.verify);

module.exports = router;