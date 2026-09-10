const express = require('express');
const router = express.Router();
const { searchUsers, getPublicProfile, getUserPresence } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { searchUsersValidator } = require('../validators/userValidators');

router.use(protect);

router.get('/search', searchUsersValidator, searchUsers);
router.get('/:userId/presence', getUserPresence);
router.get('/:userId', getPublicProfile);

module.exports = router;