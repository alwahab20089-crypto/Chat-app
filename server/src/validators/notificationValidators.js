const { param, query } = require('express-validator');

const getNotificationsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Invalid limit').toInt(),
];

const markNotificationReadValidator = [
  param('notificationId').isMongoId().withMessage('Invalid notification id'),
];

module.exports = { getNotificationsValidator, markNotificationReadValidator };