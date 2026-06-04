export function authMiddleware(req, res, next) {
  // In a real app, you would verify a JWT or session.
  // For now we simply read a custom header for role.
  const role = req.headers['x-user-role'] || 'guest';
  req.user = { role };
  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    // For API calls we return 401 with a redirect hint.
    return res.status(401).json({ error: 'Unauthorized', redirect: '/' });
  }
  next();
}
