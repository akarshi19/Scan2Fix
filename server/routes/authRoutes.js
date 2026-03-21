// ============================================
// Auth Routes
// ============================================
// Maps URLs to controller functions
//
// POST /api/auth/login    → Login (public)
// POST /api/auth/signup   → Signup (public)
// GET  /api/auth/me       → Get current user (protected)
// PUT  /api/auth/profile  → Update profile (protected)
// ============================================

const express = require('express');
const router = express.Router();
const { login, signup, getMe, updateProfile, forgotPassword, resetPassword, changePassword,   } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes (no token needed)
router.post('/login', login);
router.post('/signup', signup);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes (token required)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;