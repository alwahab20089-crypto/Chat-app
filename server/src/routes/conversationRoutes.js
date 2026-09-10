const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const attachmentUpload = require('../middleware/attachmentUpload');
const {
  createOrGetConversation,
  getConversations,
  getConversationById,
  getMessages,
  searchMessages,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  sendMessage,
  editMessage,
  deleteMessage,
} = require('../controllers/conversationController');
const {
  createConversationValidator,
  getMessagesValidator,
  searchMessagesValidator,
  sendMessageValidator,
  editMessageValidator,
  deleteMessageValidator,
  pinMessageValidator,
  unpinMessageValidator,
  getPinnedMessagesValidator,
} = require('../validators/conversationValidators');

router.use(protect);

router.get('/', getConversations);
router.post('/', createConversationValidator, createOrGetConversation);
router.get('/:conversationId', getConversationById);
router.get('/:conversationId/messages', getMessagesValidator, getMessages);
router.get('/:conversationId/messages/search', searchMessagesValidator, searchMessages);
// PHASE 15 — pinned-messages list. Declared alongside /messages/search for
// the same reason: a literal path segment ahead of any `:messageId` route.
router.get('/:conversationId/pinned-messages', getPinnedMessagesValidator, getPinnedMessages);
router.post(
  '/:conversationId/messages',
  attachmentUpload.single('attachment'),
  sendMessageValidator,
  sendMessage
);
router.patch('/:conversationId/messages/:messageId', editMessageValidator, editMessage);
router.delete('/:conversationId/messages/:messageId', deleteMessageValidator, deleteMessage);
router.post('/:conversationId/messages/:messageId/pin', pinMessageValidator, pinMessage); // PHASE 15
router.delete('/:conversationId/messages/:messageId/pin', unpinMessageValidator, unpinMessage); // PHASE 15
module.exports = router;