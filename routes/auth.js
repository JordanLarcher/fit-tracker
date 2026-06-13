const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { register, login, getMe, refresh, forgotPassword, resetPassword, googleCallback } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { validateRegister, validateLogin, validateForgotPassword, validateResetPassword } = require('../middlewares/validate');

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

router.get('/me', protect, getMe);
router.post('/refresh', protect, refresh);

router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password/:token', validateResetPassword, resetPassword);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), googleCallback);

module.exports = router;
