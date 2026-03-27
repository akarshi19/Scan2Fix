
// Role-Based Access Middleware

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