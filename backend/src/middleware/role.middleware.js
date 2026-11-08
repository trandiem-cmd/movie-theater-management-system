
export function requireRole(...allowedRoles) {
  return function (req, res, next) {

    // 1. Check authentication
    if (!req.session?.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // 2. Get role from server-side session
    const userRole = req.session.user.role;

    // 3. Check authorization
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
      });
    }

    // 4. Allow request to continue
    next();
  };
}
