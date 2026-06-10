const express = require('express');
const router = express.Router();
const {
  getProgress, getProgressEntry, createProgress,
  updateProgress, deleteProgress, getStats,
} = require('../controllers/progressController');
const { protect } = require('../middlewares/auth');
const { validateProgress } = require('../middlewares/validate');

router.use(protect);

router.get('/stats', getStats);

router.get('/', getProgress);
router.get('/:id', getProgressEntry);
router.post('/', validateProgress, createProgress);
router.put('/:id', validateProgress, updateProgress);
router.delete('/:id', deleteProgress);

module.exports = router;
