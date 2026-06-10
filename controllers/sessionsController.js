// controllers/sessionController.js
// ─────────────────────────────────────────────────────────────────
// Además del CRUD básico, al crear una sesión actualizamos el streak
// del usuario. La lógica del streak:
//   - Si la última sesión fue HOY → no cambia el streak
//   - Si la última sesión fue AYER → streak++
//   - Si fue hace más de 1 día → streak se reinicia a 1
// ─────────────────────────────────────────────────────────────────

const Session = require('../models/sessions');
const User = require('../models/user');

const getSessions = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [sessions, total] = await Promise.all([
    Session.find({ user: req.user._id })
      .populate('routine', 'name')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Session.countDocuments({ user: req.user._id }),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: sessions,
  });
};

const getSession = async (req, res) => {
  const session = await Session.findOne({
    _id: req.params.id,
    user: req.user._id, // Aislamiento: solo puedes ver tus propias sesiones
  }).populate('routine');

  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found.' });
  }

  res.status(200).json({ success: true, data: session });
};

const createSession = async (req, res) => {
  const session = await Session.create({ ...req.body, user: req.user._id });

  // ─── Actualizar streak del usuario ──────────────────────────
  const user = await User.findById(req.user._id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let { streak, lastWorkoutDate } = user;

  if (lastWorkoutDate) {
    const last = new Date(lastWorkoutDate);
    last.setHours(0, 0, 0, 0);

    if (last.getTime() === today.getTime()) {
      // Ya entrenó hoy — sin cambio
    } else if (last.getTime() === yesterday.getTime()) {
      streak += 1; // Día consecutivo
    } else {
      streak = 1; // Cadena rota
    }
  } else {
    streak = 1; // Primera sesión
  }

  await User.findByIdAndUpdate(req.user._id, {
    streak,
    lastWorkoutDate: new Date(),
  });
  // ─────────────────────────────────────────────────────────────

  res.status(201).json({ success: true, data: session });
};

const updateSession = async (req, res) => {
  const session = await Session.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found.' });
  }

  res.status(200).json({ success: true, data: session });
};

const deleteSession = async (req, res) => {
  const session = await Session.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found.' });
  }

  res.status(204).send();
};

module.exports = { getSessions, getSession, createSession, updateSession, deleteSession };