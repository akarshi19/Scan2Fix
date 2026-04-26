const express = require('express');
const router = express.Router();
const {
  login,
  signup,
  getMe,
  updateProfile,
  deleteAccount,
  forgotPassword,
  resetPassword,
  changePassword,
  sendVerificationCode,
  verifyEmailCode,
  savePushToken,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes (no token needed)
router.post('/login', login);
router.post('/signup', signup);
router.post('/send-verification-code', sendVerificationCode);
router.post('/verify-email-code', verifyEmailCode);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes (token required)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.put('/push-token', protect, savePushToken);
router.delete('/account', protect, deleteAccount);

module.exports = router;