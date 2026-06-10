// controllers/routineController.js

const Routine = require('../models/routines');

const getRoutines = async (req, res) => {
  // Devuelve: las rutinas privadas del usuario + todas las públicas
  const filter = {
    $or: [{ owner: req.user._id }, { isPublic: true }],
  };

  const routines = await Routine.find(filter)
    .populate('owner', 'name email')
    .populate('exercises.exercise', 'name bodyPart equipment gifUrl')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: routines.length, data: routines });
};

const getRoutine = async (req, res) => {
  const routine = await Routine.findById(req.params.id)
    .populate('owner', 'name')
    .populate('exercises.exercise');

  if (!routine) {
    return res.status(404).json({ success: false, message: 'Routine not found.' });
  }

  const isOwner = routine.owner && routine.owner._id.toString() === req.user._id.toString();
  if (!routine.isPublic && !isOwner) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  res.status(200).json({ success: true, data: routine });
};

const createRoutine = async (req, res) => {
  const routine = await Routine.create({ ...req.body, owner: req.user._id });
  res.status(201).json({ success: true, data: routine });
};

const updateRoutine = async (req, res) => {
  const routine = await Routine.findById(req.params.id);
  if (!routine) {
    return res.status(404).json({ success: false, message: 'Routine not found.' });
  }

  if (routine.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Only the owner can edit this routine.' });
  }

  const updated = await Routine.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('exercises.exercise', 'name bodyPart');

  res.status(200).json({ success: true, data: updated });
};

const deleteRoutine = async (req, res) => {
  const routine = await Routine.findById(req.params.id);
  if (!routine) {
    return res.status(404).json({ success: false, message: 'Routine not found.' });
  }

  if (routine.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  await routine.deleteOne();
  res.status(204).send();
};

// ─── Stretch: Copiar rutina pública al propio perfil ──────────
const copyRoutine = async (req, res) => {
  const source = await Routine.findById(req.params.id);
  if (!source || (!source.isPublic && source.owner.toString() !== req.user._id.toString())) {
    return res.status(404).json({ success: false, message: 'Routine not found.' });
  }

  const copy = await Routine.create({
    name: `${source.name} (copy)`,
    description: source.description,
    exercises: source.exercises,
    owner: req.user._id,
    isPublic: false,
    tags: source.tags,
  });

  res.status(201).json({ success: true, data: copy });
};

module.exports = { getRoutines, getRoutine, createRoutine, updateRoutine, deleteRoutine, copyRoutine };