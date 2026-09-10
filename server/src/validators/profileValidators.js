const { body } = require('express-validator');

const updateBioValidator = [
  body('bio').optional({ checkFalsy: true }).isLength({ max: 160 }).withMessage('Bio must be under 160 characters'),
];

const updateNameValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Name must be 2-60 characters'),
];

const updateUsernameValidator = [
  body('username')
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3-20 characters')
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Username can only contain lowercase letters, numbers and underscores'),
];

module.exports = { updateBioValidator, updateNameValidator, updateUsernameValidator };