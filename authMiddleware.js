/**
 * requireAuth — verifica que el usuario tenga sesión activa.
 * Si no → 401 { message: "No autenticado" }
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ message: 'No autenticado' });
}

/**
 * requireAdmin — verifica que el usuario sea administrador.
 * No autenticado → 401
 * Autenticado pero no admin → 403
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  if (req.session.user.rol !== 'admin') {
    return res.status(403).json({ message: 'No tienes permisos de administrador' });
  }
  return next();
}

module.exports = { requireAuth, requireAdmin };
