// controllers/authController.js
// ─────────────────────────────────────────────────────────────────
// Responsable de: register, login, getMe, refresh token.
//
// IMPORTANTE: Siempre usamos mensajes de error genéricos para login
// ("Invalid email or password") para no revelar si el email existe.
// ─────────────────────────────────────────────────────────────────

const User = require('../models/user');
const { signToken } = require('../utils/token');

// ─── POST /auth/register ───────────────────────────────────────
const register = async (req, res) => {
  const { name, email, password } = req.body;

  // Verificar si el email ya existe
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists.',
    });
  }

  // Crear usuario — el hook pre('save') hasheará la password
  const user = await User.create({ name, email, password });

  // Generar token y responder
  const token = signToken({ id: user._id, email: user.email, role: user.role });

  res.status(201).json({
    success: true,
    token,
    expiresIn: process.env.JWT_EXPIRES_IN,
    user: user.toPublicJSON(),
  });
};

// ─── POST /auth/login ──────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  // Necesitamos incluir password explícitamente (tiene select: false)
  const user = await User.findOne({ email }).select('+password');

  // Mensaje genérico tanto si no existe el email como si la password es incorrecta
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  const token = signToken({ id: user._id, email: user.email, role: user.role });

  res.status(200).json({
    success: true,
    token,
    expiresIn: process.env.JWT_EXPIRES_IN,
    user: user.toPublicJSON(),
  });
};

// ─── GET /auth/me ──────────────────────────────────────────────
// req.user ya fue poblado por el middleware protect
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user.toPublicJSON(),
  });
};

// ─── POST /auth/refresh ────────────────────────────────────────
// El cliente envía el token actual (aún no expirado) y recibe uno nuevo.
// En producción real usarías un refresh token de larga duración
// almacenado en una cookie httpOnly, pero para este proyecto el
// enfoque simple (re-firmar con el mismo payload) es suficiente.
const refresh = async (req, res) => {
  // req.user existe porque pasó por protect
  const token = signToken({
    id: req.user._id,
    email: req.user.email,
    role: req.user.role,
  });

  res.status(200).json({
    success: true,
    token,
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

module.exports = { register, login, getMe, refresh };