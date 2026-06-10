
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // ← NUNCA se incluye en queries por defecto
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
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
  }
);

// ─── Hook: hashear password antes de guardar ───────────────────
// Hook async: Mongoose usa la promesa devuelta (no se recibe `next`).
userSchema.pre('save', async function () {
  // Solo hashear si el campo password fue modificado
  if (!this.isModified('password')) return;

  // saltRounds=12: buen balance entre seguridad y performance
  // (10 es el default, 12 agrega ~4x más tiempo de cómputo para atacantes)
  this.password = await bcrypt.hash(this.password, 12);
});

// ─── Método de instancia: comparar password ────────────────────
// Lo definimos en el schema para mantener la lógica de auth
// cerca del modelo, no en el controller.
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Método: serializar para respuesta API ─────────────────────
// Evita exponer el hash por accidente en respuestas JSON
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);