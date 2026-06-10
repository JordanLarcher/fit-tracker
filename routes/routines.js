const express = require('express');
const router = express.Router();
const {
  getRoutines, getRoutine, createRoutine,
  updateRoutine, deleteRoutine, copyRoutine,
} = require('../controllers/routinesController');
const { protect } = require('../middlewares/auth');
const { validateRoutine } = require('../middlewares/validate');

router.use(protect);

router.get('/', getRoutines);
router.get('/:id', getRoutine);
router.post('/', validateRoutine, createRoutine);
router.put('/:id', validateRoutine, updateRoutine);
router.delete('/:id', deleteRoutine);
router.post('/:id/copy', copyRoutine);

module.exports = router;
