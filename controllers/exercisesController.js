// controllers/exercisesController.js
// ─────────────────────────────────────────────────────────────────
// The exercise catalog supports:
//   - Full-text search with $text (uses the schema's text index)
//   - Filters by bodyPart, equipment, difficulty
//   - Simple pagination with limit/skip
//
// Public exercises (system + user-created public ones) are visible without auth.
// Private ones are only seen by their owner.
// ─────────────────────────────────────────────────────────────────

const Exercise = require('../models/exercises');

// ─── GET /exercises ────────────────────────────────────────────
const getExercises = async (req, res) => {
  const { search, bodyPart, equipment, difficulty, page = 1, limit = 20 } = req.query;

  // Construir el filtro base
  const filter = {
    $or: [
      { isPublic: true },
      // If there's an authenticated user, they can also see their own private ones
      ...(req.user ? [{ createdBy: req.user._id }] : []),
    ],
  };

  // Full-text search (uses the $text index from the schema)
  if (search) {
    filter.$text = { $search: search };
  }

  // Filtros opcionales
  if (bodyPart) filter.bodyPart = bodyPart.toLowerCase();
  if (equipment) filter.equipment = equipment.toLowerCase();
  if (difficulty) filter.difficulty = difficulty.toLowerCase();

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Exercise.countDocuments(filter);

  const exercises = await Exercise.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .sort(search ? { score: { $meta: 'textScore' } } : { name: 1 });

  res.status(200).json({
    success: true,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: exercises,
  });
};

// ─── GET /exercises/:id ────────────────────────────────────────
const getExercise = async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) {
    return res.status(404).json({ success: false, message: 'Exercise not found.' });
  }

  // Verificar acceso a ejercicios privados
  if (!exercise.isPublic && (!req.user || exercise.createdBy?.toString() !== req.user._id.toString())) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  res.status(200).json({ success: true, data: exercise });
};

// ─── POST /exercises ───────────────────────────────────────────
const createExercise = async (req, res) => {
  const exerciseData = {
    ...req.body,
    createdBy: req.user._id,
  };

  const exercise = await Exercise.create(exerciseData);
  res.status(201).json({ success: true, data: exercise });
};

// ─── PUT /exercises/:id ────────────────────────────────────────
const updateExercise = async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) {
    return res.status(404).json({ success: false, message: 'Exercise not found.' });
  }

  // Solo el creador o un admin puede editar
  const isOwner = exercise.createdBy?.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const updated = await Exercise.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: updated });
};

// ─── DELETE /exercises/:id ─────────────────────────────────────
const deleteExercise = async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) {
    return res.status(404).json({ success: false, message: 'Exercise not found.' });
  }

  const isOwner = exercise.createdBy?.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  await exercise.deleteOne();
  res.status(204).send();
};

// ─── GET /exercises/:id/gif ────────────────────────────────────
// Proxy for the ExerciseDB animation. The ExerciseDB listing no longer
// includes gifUrl; the image lives at /image and requires the API key on
// the server. Here we fetch it with the server key and serve it to the
// frontend (so the key is never exposed).
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';

const getExerciseGif = async (req, res) => {
  const exercise = await Exercise.findById(req.params.id).select('externalId');
  if (!exercise || !exercise.externalId) {
    return res.status(404).json({ success: false, message: 'No animation available for this exercise.' });
  }

  if (!process.env.RAPIDAPI_KEY) {
    return res.status(503).json({ success: false, message: 'Exercise media not configured.' });
  }

  const resolution = req.query.resolution === '360' ? '360' : '180';
  const url = `https://${RAPIDAPI_HOST}/image?resolution=${resolution}&exerciseId=${encodeURIComponent(exercise.externalId)}`;

  const upstream = await fetch(url, {
    headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 'X-RapidAPI-Host': RAPIDAPI_HOST },
  });

  if (!upstream.ok) {
    return res.status(502).json({ success: false, message: 'Could not load exercise animation.' });
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  res.set('Content-Type', upstream.headers.get('content-type') || 'image/gif');
  res.set('Cache-Control', 'public, max-age=86400'); // cache 1 day
  res.send(buffer);
};

module.exports = { getExercises, getExercise, createExercise, updateExercise, deleteExercise, getExerciseGif };