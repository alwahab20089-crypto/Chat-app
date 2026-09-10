const { body, param, query } = require('express-validator');

const createConversationValidator = [
  body('userId').trim().notEmpty().withMessage('userId is required'),
];

const getMessagesValidator = [
  param('conversationId').notEmpty().withMessage('conversationId is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Invalid limit').toInt(),
];

const sendMessageValidator = [
  param('conversationId').notEmpty().withMessage('conversationId is required'),
  body('content')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message is too long (max 2000 characters)'),
  // PHASE 10 — reply target, optional. Ownership/conversation-match is
  // verified in the controller (needs a DB lookup, not just shape checking).
  body('replyToMessageId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('Invalid reply target'),
];

// PHASE 11 — edit. `content` must be present (so an edit always sends
// something), but we deliberately don't reject an empty/whitespace string
// here: whether that's allowed depends on whether the message has an
// attachment, which the controller alone knows after loading the message.
const editMessageValidator = [
  param('conversationId').notEmpty().withMessage('conversationId is required'),
  param('messageId').isMongoId().withMessage('Invalid message id'),
  body('content')
    .exists()
    .withMessage('Content is required')
    .isString()
    .withMessage('Invalid content')
    .isLength({ max: 2000 })
    .withMessage('Message is too long (max 2000 characters)'),
];

// PHASE 11 — delete
const deleteMessageValidator = [
  param('conversationId').notEmpty().withMessage('conversationId is required'),
  param('messageId').isMongoId().withMessage('Invalid message id'),
];
// PHASE 14 — search. `q` is only checked for presence here; the
// minimum-length rule (Section 6) is enforced in the controller so it can
// return the exact "Type at least N characters" message instead of a
// generic validator error.
const searchMessagesValidator = [
  param('conversationId').notEmpty().withMessage('conversationId is required'),
  query('q').trim().notEmpty().withMessage('Search query is required').isLength({ max: 200 }).withMessage('Search query is too long'),
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Invalid limit').toInt(),
];
// PHASE 15 — pin / unpin share the same param shape as delete.
const pinMessageValidator = [
  param('conversationId').notEmpty().withMessage('conversationId is required'),
  param('messageId').isMongoId().withMessage('Invalid message id'),
];

const unpinMessageValidator = [
  param('conversationId').notEmpty().withMessage('conversationId is required'),
  param('messageId').isMongoId().withMessage('Invalid message id'),
];

const getPinnedMessagesValidator = [
  param('conversationId').notEmpty().withMessage('conversationId is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Invalid limit').toInt(),
];
module.exports = {
  createConversationValidator,
  getMessagesValidator,
  searchMessagesValidator,
  sendMessageValidator,
  editMessageValidator,
  deleteMessageValidator,
  pinMessageValidator,
  unpinMessageValidator,
  getPinnedMessagesValidator,
};
  