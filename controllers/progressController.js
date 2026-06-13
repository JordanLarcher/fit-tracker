// controllers/progressController.js

const Progress = require('../models/progress');
const Session = require('../models/sessions');

const getProgress = async (req, res) => {
  const { sessionId, exerciseId } = req.query;
  const filter = { user: req.user._id };

  if (sessionId) filter.session = sessionId;
  if (exerciseId) filter.exercise = exerciseId;

  const progress = await Progress.find(filter)
    .populate('exercise', 'name bodyPart')
    .populate('session', 'date routine')
    .sort({ recordedAt: -1 });

  res.status(200).json({ success: true, count: progress.length, data: progress });
};

const getProgressEntry = async (req, res) => {
  const entry = await Progress.findOne({ _id: req.params.id, user: req.user._id })
    .populate('exercise')
    .populate('session');

  if (!entry) {
    return res.status(404).json({ success: false, message: 'Progress entry not found.' });
  }

  res.status(200).json({ success: true, data: entry });
};

const createProgress = async (req, res) => {
  // Verify the session belongs to the user
  const session = await Session.findOne({
    _id: req.body.session,
    user: req.user._id,
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session not found or does not belong to you.',
    });
  }

  const entry = await Progress.create({ ...req.body, user: req.user._id });
  res.status(201).json({ success: true, data: entry });
};

const updateProgress = async (req, res) => {
  const entry = await Progress.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!entry) {
    return res.status(404).json({ success: false, message: 'Progress entry not found.' });
  }

  res.status(200).json({ success: true, data: entry });
};

const deleteProgress = async (req, res) => {
  const entry = await Progress.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!entry) {
    return res.status(404).json({ success: false, message: 'Progress entry not found.' });
  }

  res.status(204).send();
};

// ─── GET /progress/stats — Stretch Challenge ───────────────────
// Returns: Personal Records by exercise, total volume per week
const getStats = async (req, res) => {
  const userId = req.user._id;

  // Aggregation for PR (max weight lifted per exercise)
  const personalRecords = await Progress.aggregate([
    { $match: { user: userId } },
    { $unwind: '$sets' },
    {
      $group: {
        _id: '$exercise',
        maxWeight: { $max: '$sets.weightKg' },
        totalSets: { $sum: 1 },
        totalReps: { $sum: '$sets.reps' },
      },
    },
    {
      $lookup: {
        from: 'exercises',
        localField: '_id',
        foreignField: '_id',
        as: 'exerciseInfo',
      },
    },
    { $unwind: '$exerciseInfo' },
    {
      $project: {
        exerciseName: '$exerciseInfo.name',
        bodyPart: '$exerciseInfo.bodyPart',
        maxWeight: 1,
        totalSets: 1,
        totalReps: 1,
      },
    },
    { $sort: { maxWeight: -1 } },
    { $limit: 10 },
  ]);

  // Total volume per week (last 8 weeks)
  const weeklyVolume = await Progress.aggregate([
    { $match: { user: userId } },
    { $unwind: '$sets' },
    {
      $group: {
        _id: {
          week: { $isoWeek: '$recordedAt' },
          year: { $isoWeekYear: '$recordedAt' },
        },
        totalVolume: {
          $sum: { $multiply: ['$sets.weightKg', '$sets.reps'] },
        },
        workoutCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.week': -1 } },
    { $limit: 8 },
  ]);

  res.status(200).json({
    success: true,
    data: { personalRecords, weeklyVolume },
  });
};

module.exports = {
  getProgress,
  getProgressEntry,
  createProgress,
  updateProgress,
  deleteProgress,
  getStats,
};