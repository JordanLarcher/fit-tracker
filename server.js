// server.js
// ─────────────────────────────────────────────────────────────────
// El punto de entrada de la aplicación. Responsabilidades:
//   1. Cargar variables de entorno
//   2. Conectar a MongoDB
//   3. Registrar middlewares globales
//   4. Montar rutas
//   5. Registrar el error handler global
//   6. Escuchar en el puerto
// ─────────────────────────────────────────────────────────────────

require('dotenv').config(); // SIEMPRE primero

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const expressLayouts = require('express-ejs-layouts');
const swaggerUi = require('swagger-ui-express');

const connectDB = require('./config/db');
const { swaggerDocument, swaggerOptions } = require('./config/swagger');

// ─── Rutas ────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const exerciseRoutes = require('./routes/exercises');
const routineRoutes = require('./routes/routines');
const sessionRoutes = require('./routes/sessions');
const progressRoutes = require('./routes/progress');

// ─── Conectar DB ──────────────────────────────────────────────
connectDB();

const app = express();

// ─── Seguridad ────────────────────────────────────────────────
app.use(
  helmet({
    // Relajamos CSP para permitir que Swagger UI cargue sus assets
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? ['https://tu-app-en-heroku.herokuapp.com'] // Cambiar por tu dominio real
      : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Limitar tamaño para prevenir DoS
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Archivos estáticos ───────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── View Engine (EJS) ────────────────────────────────────────
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main'); // Layout por defecto

// ─── Documentación Swagger ───────────────────────────────────
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

// ─── Rutas API ────────────────────────────────────────────────
// Montadas bajo /api para no chocar con las páginas (vistas EJS),
// que usan los mismos nombres (/exercises, /routines, …).
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/progress', progressRoutes);

// ─── Rutas de vistas EJS ──────────────────────────────────────
app.get('/', (req, res) => res.render('home', { title: 'Home', layout: false }));
app.get('/login', (req, res) => res.render('auth/login', { title: 'Login', layout: false }));
app.get('/dashboard', (req, res) => res.render('dashboard', { title: 'Home', active: 'inicio' }));
app.get('/exercises', (req, res) => res.render('exercises/index', { title: 'Catalog', active: 'catalogo' }));
app.get('/routines', (req, res) => res.render('routines/index', { title: 'Routines', active: 'rutinas' }));
app.get('/sessions', (req, res) => res.render('sessions/index', { title: 'Log', active: 'diario' }));
app.get('/progress', (req, res) => res.render('progress/index', { title: 'Stats', active: 'estadisticas' }));
app.get('/public', (req, res) => res.render('public/index', { title: 'Public', active: 'publica' }));
app.get('/profile', (req, res) => res.render('profile/index', { title: 'Profile', active: 'perfil' }));

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: `Route ${req.path} not found.` });
  }
  res.status(404).render('404', { title: '404 — Not Found' });
});

// ─── Error Handler Global ─────────────────────────────────────
// Express 5 captura errores async automáticamente y los redirige aquí.
// Este middleware SIEMPRE tiene 4 parámetros (err, req, res, next).
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);

  // Errores de validación de Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({ success: false, message: errors.join(', ') });
  }

  // ID de MongoDB inválido
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format.' });
  }

  // Duplicate key (ej: email único)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already in use.`,
    });
  }

  // Error genérico
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Iniciar servidor ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 FitTrack server running on port ${PORT}`);
  console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});