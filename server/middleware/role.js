// ============================================
// Role-Based Access Middleware
// ============================================
// Replaces Supabase's RLS policies like:
//   "Allow only if role = 'ADMIN'"
//
// USAGE:
//   router.get('/admin-only', protect, authorize('ADMIN'), handler)
//   router.get('/staff-or-admin', protect, authorize('ADMIN','STAFF'), handler)
//
// Must be used AFTER the protect middleware
// (because it needs req.user to exist)
// ============================================

const authorize = (...roles) => {
  return (req, res, next) => {
    // req.user was set by the protect middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route. Required: ${roles.join(' or ')}`,
      });
    }

    next();
  };
};

module.exports = { authorize };