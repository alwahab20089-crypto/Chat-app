const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const presence = require('./presence');
const messageStatus = require('./messageStatus');
const reactions = require('./reactions');

function initSocket(io) {
  io.use(async (socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      if (!rawCookie) return next(new Error('Not authenticated'));

      const parsed = cookie.parse(rawCookie);
      const token = parsed.token;
      if (!token) return next(new Error('Not authenticated'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('Not authenticated'));

      socket.userId = user._id.toString();
      next();
    } catch (err) {
      next(new Error('Not authenticated'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);

    // Only announce "online" the moment this is the user's FIRST active connection —
    // a second tab/device joining does not re-trigger this.
    const becameOnline = presence.addConnection(socket.userId, socket.id);
    if (becameOnline) {
      io.emit('user:online', { userId: socket.userId });
    }

    // ─── OFFLINE-RECIPIENT CATCH-UP (Phase 7) ────────────────────────
    // Any message that was sent to this user while they weren't connected
    // is still sitting at "sent". Now that this socket can receive pushes,
    // those messages become "delivered". Runs on every connect/reconnect —
    // cheap no-op once nothing is pending.
    (async () => {
      try {
        const groups = await messageStatus.markAllDeliveredForUser(socket.userId);
        groups.forEach(({ conversationId, senderId, ids }) => {
          io.to(`user:${senderId}`).emit('message:status', {
            conversationId,
            messageIds: ids,
            status: 'delivered',
          });
        });
      } catch (err) {
        console.error('offline delivery catch-up error:', err.message);
      }
    })();
        // ─── UNREAD SYNC ON CONNECT/RECONNECT (Phase 12) ─────────────────
    // Snapshot of every conversation this user is in + its current unread
    // count, pushed to THIS socket only. Covers the case where targeted
    // conversation:unread events were missed entirely while offline —
    // the client applies this as a full merge, not an increment, so it
    // can never double-count.
    (async () => {
      try {
        const conversations = await Conversation.find({ participants: socket.userId }).select('_id');
        const conversationIds = conversations.map((c) => c._id);
        const counts = await messageStatus.getUnreadCountsForUser(socket.userId, conversationIds);

        socket.emit('conversation:unread:sync', {
          conversations: conversationIds.map((id) => ({
            conversationId: id.toString(),
            unreadCount: counts.get(id.toString()) || 0,
          })),
        });
      } catch (err) {
        console.error('unread sync on connect error:', err.message);
      }
    })();
        // ─── NOTIFICATION SYNC ON CONNECT/RECONNECT (Phase 13) ───────────
    // Just the count — the full list is fetched via GET /api/notifications
    // on app load, so we don't need to push notification bodies over the
    // socket too. This guards only against a notification:new/read event
    // that was missed entirely while this socket was disconnected.
    (async () => {
      try {
        const Notification = require('../models/Notification');
        const unreadCount = await Notification.countDocuments({ user: socket.userId, isRead: false });
        socket.emit('notification:sync', { unreadCount });
      } catch (err) {
        console.error('notification sync on connect error:', err.message);
      }
    })();

    socket.on('conversation:join', async (conversationId, callback) => {
      try {
        if (!conversationId) return;
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some((p) => p.toString() === socket.userId);
        if (!isParticipant) return;

        socket.join(`conversation:${conversationId}`);
        if (typeof callback === 'function') callback({ ok: true });
      } catch {
        if (typeof callback === 'function') callback({ ok: false });
      }
    });

    socket.on('conversation:leave', (conversationId) => {
      if (conversationId) socket.leave(`conversation:${conversationId}`);
    });

    // ─── TYPING INDICATORS (Phase 6) ─────────────────────────────────
    socket.on('typing:start', async ({ conversationId } = {}) => {
      try {
        if (!conversationId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === socket.userId
        );
        if (!isParticipant) return;

        socket.to(`conversation:${conversationId}`).emit('typing:start', {
          conversationId,
          userId: socket.userId,
        });
      } catch (err) {
        console.error('typing:start error:', err.message);
      }
    });

    socket.on('typing:stop', async ({ conversationId } = {}) => {
      try {
        if (!conversationId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === socket.userId
        );
        if (!isParticipant) return;

        socket.to(`conversation:${conversationId}`).emit('typing:stop', {
          conversationId,
          userId: socket.userId,
        });
      } catch (err) {
        console.error('typing:stop error:', err.message);
      }
    });

    // ─── MESSAGE STATUS: DELIVERED (Phase 7) ─────────────────────────
    // Client acks the moment its socket actually receives message:new.
    socket.on('message:delivered', async ({ conversationId, messageId } = {}) => {
      try {
        if (!conversationId || !messageId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === socket.userId
        );
        if (!isParticipant) return;

        const result = await messageStatus.markDelivered(conversationId, socket.userId, messageId);
        if (!result) return; // not found, not the recipient, or not a valid sent->delivered transition

        io.to(`user:${result.senderId}`).emit('message:status', {
          conversationId,
          messageIds: [result.id],
          status: 'delivered',
        });
      } catch (err) {
        console.error('message:delivered error:', err.message);
      }
    });

        // ─── MESSAGE STATUS: READ (Phase 7) ──────────────────────────────
    socket.on('message:read', async ({ conversationId, lastReadMessageId } = {}) => {
      try {
        if (!conversationId || !lastReadMessageId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === socket.userId
        );
        if (!isParticipant) return;

        const result = await messageStatus.markReadUpTo(conversationId, socket.userId, lastReadMessageId);
        if (!result) return;

        io.to(`user:${result.senderId}`).emit('message:status', {
          conversationId,
          messageIds: result.ids,
          status: 'read',
        });

        // PHASE 12 — push the READER's (not the sender's) updated unread
        // count to every one of the reader's own connected tabs/devices.
        // Recomputed (not assumed to be 0) — the reader may have only
        // caught up to an older message while newer unread ones remain.
        const unreadCount = await messageStatus.getUnreadCount(socket.userId, conversationId);
        io.to(`user:${socket.userId}`).emit('conversation:unread', {
          conversationId,
          unreadCount,
        });
      } catch (err) {
        console.error('message:read error:', err.message);
      }
    });
    // ─── EMOJI REACTIONS (Phase 9) ────────────────────────────────────
    // One event handles add / change / remove — the toggle decision is
    // made atomically in reactions.toggleReaction(), never trusting the
    // client for who reacted (socket.userId only).
    socket.on('reaction:toggle', async ({ conversationId, messageId, emoji } = {}, callback) => {
      try {
        if (!conversationId || !messageId || !emoji) {
          if (typeof callback === 'function') callback({ ok: false, message: 'Missing fields' });
          return;
        }

        const result = await reactions.toggleReaction(conversationId, messageId, socket.userId, emoji);

        if (result.error) {
          if (typeof callback === 'function') callback({ ok: false, message: result.error });
          return;
        }

        // Same delivery pattern as message:new — conversation room (for
        // open chats) PLUS each participant's personal room (so it still
        // lands if they haven't joined the conversation room yet).
        const participantRooms = result.participantIds.map((id) => `user:${id}`);
        io.to(`conversation:${conversationId}`)
          .to(participantRooms)
          .emit('message:reaction', {
            conversationId,
            messageId,
            reactions: result.reactions,
          });

        if (typeof callback === 'function') callback({ ok: true });
      } catch (err) {
        console.error('reaction:toggle error:', err.message);
        if (typeof callback === 'function') callback({ ok: false, message: 'Something went wrong' });
      }
    });
    socket.on('disconnect', async () => {
      // Typing state must never survive a dropped connection.
      socket.rooms.forEach((room) => {
        if (room.startsWith('conversation:')) {
          const conversationId = room.replace('conversation:', '');
          socket.to(room).emit('typing:stop', { conversationId, userId: socket.userId });
        }
      });

      // Only mark offline + persist lastSeen when NO active connections remain for this user
      const becameOffline = presence.removeConnection(socket.userId, socket.id);
      if (becameOffline) {
        try {
          const lastSeen = new Date();
          await User.findByIdAndUpdate(socket.userId, { lastSeen });
          io.emit('user:offline', { userId: socket.userId, lastSeen });
        } catch (err) {
          console.error('Failed to persist lastSeen:', err.message);
        }
      }
    });
  });
}

module.exports = initSocket;