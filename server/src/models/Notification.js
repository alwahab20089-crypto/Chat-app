const mongoose = require('mongoose');

// PHASE 13 — intentionally reference-only. No message content, no
// attachment data, no duplicated sender snapshot is ever stored here
// (Section 2) — display text is generated at read time in the controller,
// which is also why edited/deleted messages never require touching or
// invalidating an existing notification (Section 24/25).
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // recipient
    type: { type: String, enum: ['message'], default: 'message', required: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Fetching a user's notifications, newest first (Section 14/19).
notificationSchema.index({ user: 1, createdAt: -1 });
// Unread count / mark-all-as-read (Section 13/19).
notificationSchema.index({ user: 1, isRead: 1 });
// DB-level duplicate guard: one message can never produce two
// notifications, even under a reconnect race (Section 4/16).
notificationSchema.index({ message: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Notification', notificationSchema);