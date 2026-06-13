const mongoose = require('mongoose');

const routineExerciseSchema = new mongoose.Schema(
  {
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true,
    },
    sets: {
      type: Number,
      required: true,
      min: [1, 'Sets must be at least 1'],
      max: [20, 'Sets cannot exceed 20'],
    },
    reps: {
      type: Number,
      required: true,
      min: [1, 'Reps must be at least 1'],
    },
    restSeconds: {
      type: Number,
      default: 60,
      min: [0, 'Rest time cannot be negative'],
    },
    notes: {
      type: String,
      maxlength: 200,
    },
  },
  { _id: true } // Queremos IDs para poder editar ejercicios individuales dentro de la rutina
);

const routineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Routine name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    exercises: {
      type: [routineExerciseSchema],
      validate: {
        validator: (v) => v.length >= 1,
        message: 'A routine must have at least one exercise',
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Index for frequent queries
routineSchema.index({ owner: 1 });
routineSchema.index({ isPublic: 1 });

module.exports = mongoose.model('Routine', routineSchema);