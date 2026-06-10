const { verifyToken } = require('../utils/token');
const User = require('../models/user');

const protect = async (req, res, next) => {
  try {
    // 1. Extraer token del header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verificar firma y expiración
    const decoded = verifyToken(token); // Lanza si es inválido

    // 3. Verificar que el usuario todavía existe
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // 4. Adjuntar usuario al request para los controllers
    req.user = user;
    next();

  } catch (err) {
    // jwt.verify lanza TokenExpiredError o JsonWebTokenError
    const message =
      err.name === 'TokenExpiredError'
        ? 'Your session has expired. Please log in again.'
        : 'Invalid token. Please log in again.';

    return res.status(401).json({ success: false, message });
  }
};

/**
 * Middleware de autorización por rol.
 * Uso: router.delete('/users/:id', protect, restrictTo('admin'), handler)
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };