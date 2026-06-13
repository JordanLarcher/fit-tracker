
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // ← NEVER included in queries by default
    },
    googleId: {
      type: String,
    },
    role: {
      type: String,
      enum: ['user', 'coach', 'admin'],
      default: 'user',
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastWorkoutDate: {
      type: Date,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// ─── Hook: hash password before saving ───────────────────
// Hook async: Mongoose usa la promesa devuelta (no se recibe `next`).
userSchema.pre('save', async function () {
  // Only hash if the password field was modified
  if (!this.isModified('password')) return;

  // saltRounds=12: good balance between security and performance
  // (10 is the default, 12 adds ~4x more computation time for attackers)
  this.password = await bcrypt.hash(this.password, 12);
});

// ─── Instance method: compare password ────────────────────
// We define it on the schema to keep auth logic
// close to the model, not in the controller.
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Method: serialize for API response ─────────────────────
// Prevents accidentally exposing the hash in JSON responses
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

// ─── Instance method: generate password reset token ──────────
userSchema.methods.generateResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return token;
};

module.exports = mongoose.model('User', userSchema);