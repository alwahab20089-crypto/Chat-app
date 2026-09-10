const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// sent -> delivered -> read, enforced one-way. Every function here only ever
// moves a message forward and only writes documents that actually transition.

async function markDelivered(conversationId, recipientUserId, messageId) {
  const message = await Message.findOne({ _id: messageId, conversation: conversationId });
  if (!message) return null;

  // Only the recipient can acknowledge delivery — never the sender.
  if (message.sender.toString() === recipientUserId.toString()) return null;

  // Only a forward transition is allowed.
  if (message.status !== 'sent') return null;

  message.status = 'delivered';
  await message.save();

  return { id: message._id.toString(), senderId: message.sender.toString() };
}

async function markReadUpTo(conversationId, readerUserId, lastReadMessageId) {
  const targetMessage = await Message.findOne({ _id: lastReadMessageId, conversation: conversationId });
  if (!targetMessage) return null;

  // Everything from the OTHER participant, not already read, at or before
  // the message the reader actually reached.
  const toUpdate = await Message.find({
    conversation: conversationId,
    sender: { $ne: readerUserId },
    status: { $ne: 'read' },
    createdAt: { $lte: targetMessage.createdAt },
  }).select('_id sender');

  if (toUpdate.length === 0) return null;

  const ids = toUpdate.map((m) => m._id);
  await Message.updateMany({ _id: { $in: ids } }, { $set: { status: 'read' } });

  // 1:1 chat — every matched message shares the same sender.
  return { ids: ids.map(String), senderId: toUpdate[0].sender.toString() };
}

// Runs once per socket connection. Catches up any message that was sent while
// this user was offline (or simply not connected yet) — the moment their
// socket can now receive pushes, those "sent" messages become "delivered".
async function markAllDeliveredForUser(userId) {
  const conversations = await Conversation.find({ participants: userId }).select('_id');
  if (conversations.length === 0) return [];

  const conversationIds = conversations.map((c) => c._id);

  const pending = await Message.find({
    conversation: { $in: conversationIds },
    sender: { $ne: userId },
    status: 'sent',
  }).select('_id conversation sender');

  if (pending.length === 0) return [];

  const ids = pending.map((m) => m._id);
  await Message.updateMany({ _id: { $in: ids } }, { $set: { status: 'delivered' } });

  // Group by conversation+sender so each sender gets one notification per conversation.
  const grouped = new Map();
  for (const m of pending) {
    const key = `${m.conversation}|${m.sender}`;
    if (!grouped.has(key)) {
      grouped.set(key, { conversationId: m.conversation.toString(), senderId: m.sender.toString(), ids: [] });
    }
    grouped.get(key).ids.push(m._id.toString());
  }

  return [...grouped.values()];
}

// ─── PHASE 12 — UNREAD COUNTS ────────────────────────────────────────────
// Deliberately NOT a stored counter and NOT a second read-position model.
// A message is unread for `userId` when: it wasn't sent by them, it hasn't
// reached 'read' status, and it hasn't been soft-deleted (Phase 11 — there's
// nothing left to read). This is the exact same `status` field Phase 7
// already maintains, so there is no second source of truth to drift out of
// sync (Section 2/22).
function unreadMatchStage(userId) {
  return {
    sender: { $ne: userId },
    status: { $ne: 'read' },
    isDeleted: { $ne: true },
  };
}

// Batched — ONE query for every conversation a user is in, used for the
// conversation-list load (Section 10/17). Never scans full message history;
// relies on the existing {conversation:1, sender:1, status:1} index.
async function getUnreadCountsForUser(userId, conversationIds) {
  if (!conversationIds.length) return new Map();

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const rows = await Message.aggregate([
    { $match: { conversation: { $in: conversationIds }, ...unreadMatchStage(userObjectId) } },
    { $group: { _id: '$conversation', count: { $sum: 1 } } },
  ]);

  return new Map(rows.map((r) => [r._id.toString(), r.count]));
}

// Single-conversation count — used after a targeted event (new message,
// mark-read, delete) instead of recomputing every conversation.
async function getUnreadCount(userId, conversationId) {
  return Message.countDocuments({ conversation: conversationId, ...unreadMatchStage(userId) });
}

module.exports = {
  markDelivered,
  markReadUpTo,
  markAllDeliveredForUser,
  getUnreadCountsForUser,
  getUnreadCount,
};