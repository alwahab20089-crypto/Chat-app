const mongoose = require('mongoose');
const { ALLOWED_EMOJIS } = require('../utils/reactionPolicy');

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: { type: String, enum: ['image', 'raw'], required: true }, // Cloudinary resource_type, needed to delete later
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

// One entry per user — enforced in socket/reactions.js via an atomic
// pipeline update, and backstopped here by the emoji enum.
const reactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true, enum: ALLOWED_EMOJIS },
  },
  { _id: false }
);

// PHASE 10 — Reply snapshot. We store a small copy of the original
// message alongside a reference to it, instead of populating the full
// message on every read. This keeps message listing/pagination free of
// N+1 queries, and still lets the frontend resolve/jump to the original
// via `messageId` when it's loaded (Section 15/20).
const replySnapshotSchema = new mongoose.Schema(
  {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messageType: { type: String, enum: ['text', 'image', 'file'], required: true },
    content: { type: String, default: '' }, // truncated snapshot, not the live content
    attachmentName: { type: String, default: null }, // for image/file originals
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, trim: true, maxlength: 2000, default: '' },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file'],
      default: 'text',
    },
    attachment: { type: attachmentSchema, default: null },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    reactions: { type: [reactionSchema], default: [] },
    replyTo: { type: replySnapshotSchema, default: null }, // PHASE 10

    // PHASE 11 — edit
    editedAt: { type: Date, default: null },

    // PHASE 11 — soft delete. Content/attachment are intentionally left
    // untouched in storage (Section 13); formatMessage() is what actually
    // redacts them from every API/socket response (Section 15).
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    isPinned: { type: Boolean, default: false },
    pinnedAt: { type: Date, default: null },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
// A message must have text or an attachment — never neither.
messageSchema.pre('validate', function (next) {
  if (!this.content?.trim() && !this.attachment) {
    return next(new Error('Message must contain text or an attachment'));
  }
  next;
});

// Messages are always queried by conversation, ordered by time
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, isPinned: 1, pinnedAt: -1 });  
// Supports the delivered/read batch-update and offline-catchup queries:
// "messages TO this user, in this conversation, still at status X"
messageSchema.index({ conversation: 1, sender: 1, status: 1 });

module.exports = mongoose.model('Message', messageSchema);