const { body } = require('express-validator');

const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 60 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const otpValidator = [
  body('email').trim().isEmail().normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
];

const emailOnlyValidator = [body('email').trim().isEmail().normalizeEmail()];

const resetPasswordValidator = [
  body('email').trim().isEmail().normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

module.exports = {
  registerValidator,
  loginValidator,
  otpValidator,
  emailOnlyValidator,
  resetPasswordValidator,
};