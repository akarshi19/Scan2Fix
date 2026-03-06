// ============================================
// JWT Token Generator
// ============================================
// Replaces Supabase's automatic session tokens
//
// Supabase gave you a session with:
//   { user: { id, email }, access_token, refresh_token }
//
// We now generate our own JWT with:
//   { id, role }
// ============================================

const jwt = require('jsonwebtoken');

const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role: role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

module.exports = generateToken;