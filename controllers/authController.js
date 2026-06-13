// controllers/authController.js
// ─────────────────────────────────────────────────────────────────
// Handles: register, login, getMe, refresh token, forgot/reset password, Google OAuth.
//
// IMPORTANT: We always use generic error messages for login
// ("Invalid email or password") to not reveal if the email exists.
// ─────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const User = require('../models/user');
const { signToken } = require('../utils/token');
const { sendPasswordResetEmail } = require('../utils/email');

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

  // Create user — the pre('save') hook will hash the password
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

  // We need to explicitly include password (has select: false)
  const user = await User.findOne({ email }).select('+password');

  // Generic message whether the email doesn't exist or the password is wrong
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
// The client sends the current token (not yet expired) and receives a new one.
// In real production you would use a long-lived refresh token
// stored in a httpOnly cookie, but for this project the
// simple approach (re-sign with the same payload) is sufficient.
const refresh = async (req, res) => {
  // req.user exists because it went through protect
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

// ─── POST /auth/forgot-password ────────────────────────────────
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If that email is registered, you will receive a password reset link.',
    });
  }

  const resetToken = user.generateResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
    res.status(200).json({
      success: true,
      message: 'If that email is registered, you will receive a password reset link.',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.error('Email send error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Could not send the password reset email. Try again later.',
    });
  }
};

// ─── POST /auth/reset-password/:token ──────────────────────────
const resetPassword = async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Token is invalid or has expired.',
    });
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  const token = signToken({ id: user._id, email: user.email, role: user.role });

  res.status(200).json({
    success: true,
    token,
    expiresIn: process.env.JWT_EXPIRES_IN,
    user: user.toPublicJSON(),
  });
};

// ─── GET /auth/google/callback ─────────────────────────────────
// Passport attaches { user, token } to req.user after Google auth
const googleCallback = async (req, res) => {
  const { token } = req.user;
  res.redirect(`/auth/google/success?token=${token}`);
};

module.exports = { register, login, getMe, refresh, forgotPassword, resetPassword, googleCallback };