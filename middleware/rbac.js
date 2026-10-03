// Role-based access control middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

// Ensure teacher only touches their department
const authorizeDepartment = (req, res, next) => {
  if (req.user.role === 'admin') return next(); // admin sees all
  const dept = req.body.department || req.query.department || req.params.department;
  if (dept && dept !== req.user.department) {
    return res.status(403).json({ message: 'You can only manage your own department' });
  }
  next();
};

module.exports = { authorizeRoles, authorizeDepartment };
