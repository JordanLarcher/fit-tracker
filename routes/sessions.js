const express = require('express');
const router = express.Router();
const {
  getSessions, getSession, createSession,
  updateSession, deleteSession,
} = require('../controllers/sessionsController');
const { protect } = require('../middlewares/auth');
const { validateSession } = require('../middlewares/validate');

router.use(protect);

router.get('/', getSessions);
router.get('/:id', getSession);
router.post('/', validateSession, createSession);
router.put('/:id', validateSession, updateSession);
router.delete('/:id', deleteSession);

module.exports = router;
