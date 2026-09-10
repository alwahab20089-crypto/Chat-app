const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notificationController');
const { getNotificationsValidator, markNotificationReadValidator } = require('../validators/notificationValidators');

router.use(protect);

router.get('/', getNotificationsValidator, getNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:notificationId/read', markNotificationReadValidator, markNotificationRead);

module.exports = router;