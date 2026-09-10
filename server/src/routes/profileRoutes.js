const express = require('express');
const router = express.Router();
const { getProfile, updateBio, updateName, updateUsername, uploadProfilePicture, removeProfilePicture, deleteAccount } = require('../controllers/profileController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { updateBioValidator, updateNameValidator, updateUsernameValidator } = require('../validators/profileValidators');

router.use(protect);

router.get('/me', getProfile);
router.put('/bio', updateBioValidator, updateBio);
router.put('/name', updateNameValidator, updateName);
router.put('/username', updateUsernameValidator, updateUsername);
router.post('/picture', upload.single('image'), uploadProfilePicture);
router.delete('/picture', removeProfilePicture);
router.delete('/account', deleteAccount);

module.exports = router;