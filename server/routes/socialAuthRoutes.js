// ============================================
// Social Auth Routes
// ============================================
// POST /api/auth/google     → Google login
// POST /api/auth/microsoft  → Microsoft login
// POST /api/auth/apple      → Apple login
// ============================================

const express = require('express');
const router = express.Router();
const {
  googleLogin,
  microsoftLogin,
  appleLogin,
} = require('../controllers/socialAuthController');

router.post('/google', googleLogin);
router.post('/apple', appleLogin);

module.exports = router;