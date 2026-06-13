const mongoose = require('mongoose');

const setSchema = new mongoose.Schema(
  {
    setNumber: { type: Number, required: true },
    reps: { type: Number, required: true, min: 0 },
    weightKg: { type: Number, default: 0, min: 0 },
    completed: { type: Boolean, default: true },
  },
  { _id: false } // Los sets no necesitan ID propio
);

const progressSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true,
    },
    sets: {
      type: [setSchema],
      required: true,
      validate: {
        validator: (v) => v.length >= 1,
        message: 'At least one set is required',
      },
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for stats and charts queries
progressSchema.index({ user: 1, exercise: 1, recordedAt: -1 });
progressSchema.index({ session: 1 });

module.exports = mongoose.model('Progress', progressSchema);