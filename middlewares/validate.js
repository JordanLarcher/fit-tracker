const { body, param, query, validationResult } = require('express-validator');

// ─── Handler reutilizable de errores de validación ────────────
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─── Auth ─────────────────────────────────────────────────────
const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 60 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  handleValidationErrors,
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

// ─── Exercises ─────────────────────────────────────────────────
const validateExercise = [
  body('name').trim().notEmpty().withMessage('Exercise name is required'),
  body('bodyPart').trim().notEmpty().withMessage('Body part is required'),
  body('equipment').trim().notEmpty().withMessage('Equipment is required'),
  body('target').trim().notEmpty().withMessage('Target muscle is required'),
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
  handleValidationErrors,
];

// ─── Routines ─────────────────────────────────────────────────
const validateRoutine = [
  body('name').trim().notEmpty().withMessage('Routine name is required'),
  body('exercises')
    .isArray({ min: 1 })
    .withMessage('At least one exercise is required'),
  body('exercises.*.exercise')
    .isMongoId()
    .withMessage('Each exercise must have a valid ID'),
  body('exercises.*.sets')
    .isInt({ min: 1, max: 20 })
    .withMessage('Sets must be between 1 and 20'),
  body('exercises.*.reps')
    .isInt({ min: 1 })
    .withMessage('Reps must be at least 1'),
  body('exercises.*.restSeconds')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Rest time cannot be negative'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isString().trim().toLowerCase(),
  handleValidationErrors,
];

// ─── Sessions ─────────────────────────────────────────────────
const validateSession = [
  body('routine').isMongoId().withMessage('Valid routine ID is required'),
  body('durationMinutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be at least 1 minute'),
  body('feeling')
    .optional()
    .isIn(['great', 'good', 'average', 'tired', 'bad'])
    .withMessage('Invalid feeling value'),
  handleValidationErrors,
];

// ─── Progress ─────────────────────────────────────────────────
const validateProgress = [
  body('session').isMongoId().withMessage('Valid session ID is required'),
  body('exercise').isMongoId().withMessage('Valid exercise ID is required'),
  body('sets').isArray({ min: 1 }).withMessage('At least one set is required'),
  body('sets.*.setNumber').isInt({ min: 1 }).withMessage('Set number must be >= 1'),
  body('sets.*.reps').isInt({ min: 0 }).withMessage('Reps must be >= 0'),
  body('sets.*.weightKg').optional().isFloat({ min: 0 }).withMessage('Weight must be >= 0'),
  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateExercise,
  validateRoutine,
  validateSession,
  validateProgress,
};