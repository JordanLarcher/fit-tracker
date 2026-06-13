// server.js
// ─────────────────────────────────────────────────────────────────
// The application entry point. Responsibilities:
//   1. Load environment variables
//   2. Connect to MongoDB
//   3. Register global middlewares
//   4. Mount routes
//   5. Register the global error handler
//   6. Listen on the port
// ─────────────────────────────────────────────────────────────────

require('dotenv').config(); // ALWAYS first

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const expressLayouts = require('express-ejs-layouts');
const swaggerUi = require('swagger-ui-express');

const connectDB = require('./config/db');
const { swaggerDocument, swaggerOptions } = require('./config/swagger');
const passport = require('./config/passport');

// ─── Routes ────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const exerciseRoutes = require('./routes/exercises');
const routineRoutes = require('./routes/routines');
const sessionRoutes = require('./routes/sessions');
const progressRoutes = require('./routes/progress');

// ─── Connect DB ──────────────────────────────────────────────
connectDB();

const app = express();

// ─── Security ────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(passport.initialize());

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? ['https://fit-tracker-8ol4.onrender.com']
      : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Limit size to prevent DoS
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Static files ───────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── View Engine (EJS) ────────────────────────────────────────
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main'); // Default layout

// ─── Swagger Documentation ───────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

// ─── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  });
});

// ─── API Routes ────────────────────────────────────────────────
// Mounted under /api so they don't collide with pages (EJS views),
// which use the same names (/exercises, /routines, …).
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/progress', progressRoutes);

// ─── EJS view routes ──────────────────────────────────────
app.get('/', (req, res) => res.render('home', { title: 'Home', layout: false }));
app.get('/login', (req, res) => res.render('auth/login', { title: 'Login', layout: false }));
app.get('/dashboard', (req, res) => res.render('dashboard', { title: 'Home', active: 'inicio' }));
app.get('/exercises', (req, res) => res.render('exercises/index', { title: 'Catalog', active: 'catalogo' }));
app.get('/exercises/:id', (req, res) => res.render('exercises/detail', { title: 'Exercise Detail', active: 'catalogo', id: req.params.id }));
app.get('/routines', (req, res) => res.render('routines/index', { title: 'Routines', active: 'rutinas' }));
app.get('/sessions', (req, res) => res.render('sessions/index', { title: 'Log', active: 'diario' }));
app.get('/progress', (req, res) => res.render('progress/index', { title: 'Stats', active: 'estadisticas' }));
app.get('/public', (req, res) => res.render('public/index', { title: 'Public', active: 'publica' }));
app.get('/profile', (req, res) => res.render('profile/index', { title: 'Profile', active: 'perfil' }));
app.get('/forgot-password', (req, res) => res.render('auth/forgot-password', { title: 'Forgot Password', layout: false }));
app.get('/reset-password/:token', (req, res) => res.render('auth/reset-password', { title: 'Reset Password', layout: false, token: req.params.token }));
app.get('/auth/google/success', (req, res) => res.render('auth/google-success', { title: 'Redirecting...', layout: false }));

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: `Route ${req.path} not found.` });
  }
  res.status(404).render('404', { title: '404 — Not Found' });
});

// ─── Error Handler Global ─────────────────────────────────────
// Express 5 catches async errors automatically and routes them here.
// This middleware ALWAYS has 4 parameters (err, req, res, next).
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({ success: false, message: errors.join(', ') });
  }

  // Invalid MongoDB ID
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format.' });
  }

  // Duplicate key (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already in use.`,
    });
  }

  // Generic error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Start server ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FitTrack server running on port ${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api-docs`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});