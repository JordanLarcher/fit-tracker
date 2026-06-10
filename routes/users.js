const express = require('express');
const router = express.Router();
const { getUser, updateUser, deleteUser } = require('../controllers/usersController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
