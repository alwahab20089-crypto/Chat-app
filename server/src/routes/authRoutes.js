const express = require('express');
const router = express.Router();
const { register, verifyEmail, resendOtp, login, googleAuth, forgotPassword, verifyResetOtp, resetPassword, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const { registerValidator, loginValidator, otpValidator, emailOnlyValidator, resetPasswordValidator } = require('../validators/authValidators');

router.post('/register', authLimiter, registerValidator, register);
router.post('/verify-email', authLimiter, otpValidator, verifyEmail);
router.post('/resend-otp', otpLimiter, emailOnlyValidator, resendOtp);
router.post('/login', authLimiter, loginValidator, login);
router.post('/google', authLimiter, googleAuth);
router.post('/forgot-password', otpLimiter, emailOnlyValidator, forgotPassword);
router.post('/verify-reset-otp', authLimiter, otpValidator, verifyResetOtp);
router.post('/reset-password', authLimiter, resetPasswordValidator, resetPassword);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;