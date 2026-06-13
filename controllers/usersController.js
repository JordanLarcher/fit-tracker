// controllers/userController.js

const User = require('../models/user');

// ─── GET /users/:id ────────────────────────────────────────────
const getUser = async (req, res) => {
  // Un usuario solo puede ver su propio perfil (a menos que sea admin)
  if (req.params.id !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  res.status(200).json({ success: true, data: user.toPublicJSON() });
};

// ─── PUT /users/:id ────────────────────────────────────────────
const updateUser = async (req, res) => {
  if (req.params.id !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  // Nunca permitir actualizar password o role por esta ruta
  const { name } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  res.status(200).json({ success: true, data: user.toPublicJSON() });
};

// ─── DELETE /users/:id ─────────────────────────────────────────
const deleteUser = async (req, res) => {
  if (req.params.id !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  await User.findByIdAndDelete(req.params.id);
  res.status(204).send(); // 204: No Content — successful operation, no body
};

module.exports = { getUser, updateUser, deleteUser };