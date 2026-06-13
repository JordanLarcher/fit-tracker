const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      sparse: true, // Allows multiple documents without externalId (user-created ones)
    },
    name: {
      type: String,
      required: [true, 'Exercise name is required'],
      trim: true,
    },
    bodyPart: {
      type: String,
      required: [true, 'Body part is required'],
      lowercase: true,
    },
    equipment: {
      type: String,
      required: [true, 'Equipment is required'],
      lowercase: true,
    },
    target: {
      type: String,
      required: [true, 'Target muscle is required'],
      lowercase: true,
    },
    secondaryMuscles: {
      type: [String],
      default: [],
    },
    instructions: {
      type: [String],
      default: [],
    },
    gifUrl: {
      type: String,
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null = ejercicio del sistema / seed
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Text index for full-text searches
exerciseSchema.index({ name: 'text', target: 'text', bodyPart: 'text' });

// Indexes for common filters in the catalog
exerciseSchema.index({ bodyPart: 1 });
exerciseSchema.index({ equipment: 1 });
exerciseSchema.index({ difficulty: 1 });

module.exports = mongoose.model('Exercise', exerciseSchema);