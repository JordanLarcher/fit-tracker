const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    routine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Routine',
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    durationMinutes: {
      type: Number,
      min: [1, 'Duration must be at least 1 minute'],
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    feeling: {
      type: String,
      enum: ['great', 'good', 'average', 'tired', 'bad'],
      default: 'good',
    },
  },
  { timestamps: true }
);

// Índice compuesto para el dashboard (mis sesiones ordenadas por fecha)
sessionSchema.index({ user: 1, date: -1 });
sessionSchema.index({ routine: 1 });

module.exports = mongoose.model('Session', sessionSchema);