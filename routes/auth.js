const express = require('express');
const router = express.Router();
const { register, login, getMe, refresh } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { validateRegister, validateLogin } = require('../middlewares/validate');

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

router.get('/me', protect, getMe);
router.post('/refresh', protect, refresh);

module.exports = router;
