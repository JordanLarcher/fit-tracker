const express = require('express');
const router = express.Router();
const {
  getExercises, getExercise, createExercise,
  updateExercise, deleteExercise, getExerciseGif,
} = require('../controllers/exercisesController');
const { protect } = require('../middlewares/auth');
const { validateExercise } = require('../middlewares/validate');

router.get('/', getExercises);
router.get('/:id/gif', getExerciseGif);
router.get('/:id', getExercise);
router.post('/', protect, validateExercise, createExercise);
router.put('/:id', protect, validateExercise, updateExercise);
router.delete('/:id', protect, deleteExercise);

module.exports = router;
