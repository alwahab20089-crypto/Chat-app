const { validationResult } = require('express-validator');
const Notification = require('../models/Notification');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: errors.array()[0].msg });
    return false;
  }
  return true;
}

// Display text is generated here, never stored (Section 2) — so a
// notification always renders safely regardless of what's since happened
// to the underlying message (edited, soft-deleted — Section 10/24/25).
function formatNotification(n, senderOverride) {
  const sender = senderOverride || n.sender; // populated doc, or the raw sender used right after creation
  return {
    id: n._id,
    type: n.type,
    conversationId: n.conversation?._id || n.conversation,
    messageId: n.message,
    sender: sender
      ? {
          id: sender._id,
          name: sender.name,
          username: sender.username,
          profilePicture: sender.profilePicture,
        }
      : null,
    title: sender?.name || 'Someone',
    body: 'Sent you a message',
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

// GET /api/notifications?page=&limit=
async function getNotifications(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const page = req.query.page || 1;
    const limit = Math.min(req.query.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name username profilePicture')
        .lean(),
      Notification.countDocuments({ user: req.user._id }),
      Notification.countDocuments({ user: req.user._id, isRead: false }),
    ]);

    res.json({
      notifications: notifications.map((n) => formatNotification(n)),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + notifications.length < total,
      },
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/:notificationId/read
async function markNotificationRead(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const { notificationId } = req.params;

    // Scoped by user in the query itself — a request for someone else's
    // notification simply won't be found (404), which also avoids
    // confirming whether that ID exists at all (Section 21 — no
    // enumeration via a 403-vs-404 distinction).
    const notification = await Notification.findOne({ _id: notificationId, user: req.user._id });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();
    }

    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

    const io = req.app.get('io');
    if (io) {
      // Reaches every tab/device of this user (Section 7/8) — the DB
      // remains the single source of truth, this just syncs it out.
      io.to(`user:${req.user._id.toString()}`).emit('notification:read', {
        id: notification._id,
        unreadCount,
      });
    }

    res.json({ id: notification._id, isRead: true, unreadCount });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/read-all
async function markAllNotificationsRead(req, res, next) {
  try {
    // One bulk update, not one write per notification (Section 13).
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user._id.toString()}`).emit('notification:read-all', { unreadCount: 0 });
    }

    res.json({ unreadCount: 0 });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  formatNotification, // reused by conversationController when a message is created
};