// ============================================
// Authentication Middleware
// ============================================
// Replaces Supabase's Row Level Security (RLS)
//
// HOW IT WORKS:
// 1. Mobile app sends: Authorization: Bearer <token>
// 2. This middleware extracts and verifies the token
// 3. Attaches the full user object to req.user
// 4. If invalid/missing → 401 Unauthorized
//
// SUPABASE EQUIVALENT:
// Supabase automatically knew who was calling via the session.
// Now WE verify it manually with JWT.
// ============================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // No token found
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — no token provided',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID from token payload
    // We DON'T select password (it's already excluded by default via select:false)
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — user no longer exists',
      });
    }

    // Attach user to request object
    // Now every route handler can access req.user
    req.user = user;
    next();
  } catch (error) {
    // Token is invalid or expired
    return res.status(401).json({
      success: false,
      message: 'Not authorized — invalid token',
    });
  }
};

module.exports = { protect };