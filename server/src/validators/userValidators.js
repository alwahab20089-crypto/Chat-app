const { query } = require('express-validator');

const searchUsersValidator = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Search query is too long'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid page number')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Invalid limit')
    .toInt(),
];

module.exports = { searchUsersValidator };