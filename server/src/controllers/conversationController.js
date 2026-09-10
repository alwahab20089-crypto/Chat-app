const presence = require('../socket/presence');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const streamifier = require('streamifier');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const messageStatus = require('../socket/messageStatus'); // PHASE 12 — unread counts
const {
    IMAGE_MAX_SIZE,
    FILE_MAX_SIZE,
    sanitizeOriginalName,
    getExtension,
} = require('../utils/attachmentPolicy');
const DEFAULT_MESSAGE_LIMIT = 30;
const MAX_MESSAGE_LIMIT = 50;
const REPLY_SNAPSHOT_CONTENT_LENGTH = 200; // PHASE 10 — preview only, not the live message
const DELETED_PREVIEW_TEXT = 'This message was deleted'; // PHASE 11
const Notification = require('../models/Notification'); // PHASE 13
const { isViewingConversation } = require('../socket/conversationPresence'); // PHASE 13
const { formatNotification } = require('./notificationController'); // PHASE 13
// near the top, alongside the other pagination constants
const DEFAULT_SEARCH_LIMIT = 20; // PHASE 14
const MAX_SEARCH_LIMIT = 50;     // PHASE 14
const MIN_SEARCH_QUERY_LENGTH = 2; // PHASE 14

// PHASE 14 — escapes user input before it's dropped into a RegExp so a
// query like "a.b+" is matched literally instead of as a regex pattern
// (Section 8: "Escape user-provided regex characters").
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function handleValidation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg });
        return false;
    }
    return true;
}

function sanitizeParticipant(user) {
    if (!user) return null;
    return {
        id: user._id,
        name: user.name,
        username: user.username,
        profilePicture: user.profilePicture,
    };
}

// Short preview text for the conversation list — never leaks storage details.
function previewText(message) {
    if (!message) return '';
    if (message.isDeleted) return DELETED_PREVIEW_TEXT; // PHASE 11
    if (message.messageType === 'image') {
        return message.content?.trim() ? `📷 ${message.content.trim()}` : '📷 Image';
    }
    if (message.messageType === 'file') {
        return message.attachment?.originalName ? `📎 ${message.attachment.originalName}` : '📎 File';
    }
    return message.content || '';
}

// PHASE 12 — `unreadCount` is passed in by the caller (already computed via
// messageStatus.getUnreadCount[sForUser]) rather than queried here, so this
// stays a pure formatter with no DB access of its own.
function formatConversation(conversation, currentUserId, unreadCount = 0) {
    const other = conversation.participants.find((p) => p._id.toString() !== currentUserId.toString());
    return {
        id: conversation._id,
        otherUser: sanitizeParticipant(other),
        lastMessage: conversation.lastMessage?.preview
            ? {
                content: conversation.lastMessage.preview,
                sender: conversation.lastMessage.sender,
                createdAt: conversation.lastMessage.createdAt,
            }
            : null,
        unreadCount, // PHASE 12
        updatedAt: conversation.updatedAt,
    };
}

async function createOrGetConversation(req, res, next) {
    try {
        if (!handleValidation(req, res)) return;
        const { userId } = req.body;
        const currentUserId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user id' });
        }
        if (userId === currentUserId.toString()) {
            return res.status(400).json({ message: 'You cannot start a conversation with yourself' });
        }

        const otherUser = await User.findById(userId);
        if (!otherUser) return res.status(404).json({ message: 'User not found' });

        const key = Conversation.buildKey(currentUserId, userId);

        let conversation;
        try {
            conversation = await Conversation.findOneAndUpdate(
                { key },
                { $setOnInsert: { key, participants: [currentUserId, userId] } },
                { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
            ).populate('participants', 'name username profilePicture');
        } catch (err) {
            if (err.code === 11000) {
                conversation = await Conversation.findOne({ key }).populate('participants', 'name username profilePicture');
            } else {
                throw err;
            }
        }

        const unreadCount = await messageStatus.getUnreadCount(currentUserId, conversation._id); // PHASE 12
        res.status(200).json({ conversation: formatConversation(conversation, currentUserId, unreadCount) });
    } catch (err) {
        next(err);
    }
}

async function getConversations(req, res, next) {
    try {
        const conversations = await Conversation.find({ participants: req.user._id })
            .populate('participants', 'name username profilePicture')
            .sort({ updatedAt: -1 })
            .lean();

        // PHASE 12 — ONE batched query for every conversation's unread count
        // (Section 10/17), instead of one query per conversation.
        const conversationIds = conversations.map((c) => c._id);
        const unreadMap = await messageStatus.getUnreadCountsForUser(req.user._id, conversationIds);

        const result = conversations.map((c) => {
            const other = c.participants.find((p) => p._id.toString() !== req.user._id.toString());
            return {
                id: c._id,
                otherUser: sanitizeParticipant(other),
                lastMessage: c.lastMessage?.preview
                    ? { content: c.lastMessage.preview, sender: c.lastMessage.sender, createdAt: c.lastMessage.createdAt }
                    : null,
                unreadCount: unreadMap.get(c._id.toString()) || 0, // PHASE 12
                updatedAt: c.updatedAt,
            };
        });

        res.json({ conversations: result });
    } catch (err) {
        next(err);
    }
}

async function getConversationById(req, res, next) {
    try {
        const { conversationId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message: 'Invalid conversation id' });
        }

        const conversation = await Conversation.findById(conversationId).populate('participants', 'name username profilePicture');
        if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

        const isParticipant = conversation.participants.some((p) => p._id.toString() === req.user._id.toString());
        if (!isParticipant) return res.status(403).json({ message: 'You do not have access to this conversation' });

        const unreadCount = await messageStatus.getUnreadCount(req.user._id, conversation._id); // PHASE 12
        res.json({ conversation: formatConversation(conversation, req.user._id, unreadCount) });
    } catch (err) {
        next(err);
    }
}
// PHASE 14 — Message Search.
// Scoped strictly to one conversation (Section 2/25): membership is
// verified the same way every other conversation endpoint verifies it
// (verifyMembership), never trusting anything the client claims about
// itself. The match happens at the DB level (Section 8) using the
// existing {conversation:1, createdAt:-1} index to scope+sort, with an
// escaped, case-insensitive regex for the substring match — deliberately
// NOT a $text index, since $text tokenizes on whole words and would break
// prefix/substring queries like "proj" while the user is still typing.
async function searchMessages(req, res, next) {
    try {
        if (!handleValidation(req, res)) return;
        const { conversationId } = req.params;
        const rawQuery = (req.query.q || '').trim();
        const page = req.query.page || 1;
        const limit = Math.min(req.query.limit || DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT);

        const membership = await verifyMembership(conversationId, req.user._id);
        if (membership.error) return res.status(membership.error).json({ message: membership.message });

        // Section 6 — never run a DB search for an empty/too-short query.
        if (rawQuery.length < MIN_SEARCH_QUERY_LENGTH) {
            return res.status(400).json({ message: `Type at least ${MIN_SEARCH_QUERY_LENGTH} characters` });
        }

        const safePattern = escapeRegex(rawQuery);
        // Bounded on purpose: a plain substring match, not user-controlled
        // repetition/backreferences, so this can't become a ReDoS vector.
        const searchRegex = new RegExp(safePattern, 'i');

        const filter = {
            conversation: conversationId,
            isDeleted: { $ne: true }, // Section 3/19 — deleted messages never appear
            content: searchRegex,
        };

        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Message.countDocuments(filter),
        ]);

        const results = messages.map((m) => formatMessage(m));

        res.json({
            messages: results,
            pagination: {
                page,
                limit,
                total,
                hasMore: skip + results.length < total,
            },
        });
    } catch (err) {
        next(err);
    }
}
async function verifyMembership(conversationId, userId) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return { error: 400, message: 'Invalid conversation id' };
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return { error: 404, message: 'Conversation not found' };
    const isParticipant = conversation.participants.some((p) => p.toString() === userId.toString());
    if (!isParticipant) return { error: 403, message: 'You do not have access to this conversation' };
    return { conversation };
}

// PHASE 10 — Resolves + validates a reply target and builds the snapshot
// stored on the new message. Enforces Section 4: the original message
// must exist AND belong to this exact conversation — a client can never
// reply to a message from another conversation.
// PHASE 11 — also excludes soft-deleted messages: you can no longer start
// a NEW reply pointing at something that's already deleted.
async function resolveReplyTarget(conversationId, replyToMessageId) {
    if (!replyToMessageId) return { replyTo: null };

    if (!mongoose.Types.ObjectId.isValid(replyToMessageId)) {
        return { error: 'Invalid reply target' };
    }

    const original = await Message.findOne({
        _id: replyToMessageId,
        conversation: conversationId,
        isDeleted: { $ne: true },
    }).select('sender content messageType attachment');

    if (!original) {
        return { error: 'The message you are replying to is unavailable' };
    }

    return {
        replyTo: {
            messageId: original._id,
            sender: original.sender,
            messageType: original.messageType,
            content: (original.content || '').slice(0, REPLY_SNAPSHOT_CONTENT_LENGTH),
            attachmentName: original.attachment?.originalName || null,
        },
    };
}

function formatMessage(m, { deletedReplyTargetIds = new Set() } = {}) {
    const isDeleted = !!m.isDeleted;

    return {
        id: m._id,
        conversationId: m.conversation,
        sender: m.sender,
        content: isDeleted ? '' : m.content,
        messageType: m.messageType || 'text',
        attachment: !isDeleted && m.attachment
            ? {
                url: m.attachment.url,
                originalName: m.attachment.originalName,
                mimeType: m.attachment.mimeType,
                size: m.attachment.size,
            }
            : null,
        status: m.status || 'sent',
        reactions: (m.reactions || []).map((r) => ({
            userId: r.userId.toString(),
            emoji: r.emoji,
        })),
        replyTo: m.replyTo
            ? {
                messageId: m.replyTo.messageId,
                sender: m.replyTo.sender,
                messageType: m.replyTo.messageType,
                content: deletedReplyTargetIds.has(m.replyTo.messageId.toString()) ? '' : m.replyTo.content,
                attachmentName: deletedReplyTargetIds.has(m.replyTo.messageId.toString()) ? null : m.replyTo.attachmentName,
                isDeleted: deletedReplyTargetIds.has(m.replyTo.messageId.toString()),
            }
            : null,
        isDeleted,
        editedAt: m.editedAt || null,
        createdAt: m.createdAt,
        isPinned: !isDeleted && !!m.isPinned,
        pinnedAt: !isDeleted ? m.pinnedAt || null : null,
        pinnedBy: !isDeleted ? m.pinnedBy || null : null,
    };
}

async function getMessages(req, res, next) {
    try {
        if (!handleValidation(req, res)) return;
        const { conversationId } = req.params;
        const page = req.query.page || 1;
        const limit = Math.min(req.query.limit || DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT);

        const membership = await verifyMembership(conversationId, req.user._id);
        if (membership.error) return res.status(membership.error).json({ message: membership.message });

        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            Message.find({ conversation: conversationId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Message.countDocuments({ conversation: conversationId }),
        ]);

        const replyTargetIds = [...new Set(
            messages
                .filter((m) => m.replyTo?.messageId)
                .map((m) => m.replyTo.messageId.toString())
        )];

        let deletedReplyTargetIds = new Set();
        if (replyTargetIds.length > 0) {
            const deletedTargets = await Message.find({
                _id: { $in: replyTargetIds },
                isDeleted: true,
            }).select('_id').lean();
            deletedReplyTargetIds = new Set(deletedTargets.map((d) => d._id.toString()));
        }

        const ordered = messages.reverse().map((m) => formatMessage(m, { deletedReplyTargetIds }));

        // PHASE 12 — pagination NEVER touches unread state (Section 11):
        // this endpoint doesn't read, write, or return anything unread-
        // related. The unread count only ever comes from getConversations /
        // getConversationById / the targeted socket events below.
        res.json({
            messages: ordered,
            pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
        });
    } catch (err) {
        next(err);
    }
}

function uploadBufferToCloudinary(buffer, { resourceType, folder, publicId }) {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: resourceType,
                folder,
                public_id: publicId,
            },
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );

        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
}


async function sendMessage(req, res, next) {
    let cloudinaryResult = null;

    try {
        if (!handleValidation(req, res)) return;
        const { conversationId } = req.params;
        const content = (req.body.content || '').trim();
        const file = req.file;
        const { replyToMessageId } = req.body;

        if (!content && !file) {
            return res.status(400).json({ message: 'Message must contain text or an attachment' });
        }

        const membership = await verifyMembership(conversationId, req.user._id);
        if (membership.error) return res.status(membership.error).json({ message: membership.message });

        const replyResult = await resolveReplyTarget(conversationId, replyToMessageId);
        if (replyResult.error) {
            return res.status(400).json({ message: replyResult.error });
        }
        const replyTo = replyResult.replyTo;

        const recipient = membership.conversation.participants.find(
            (p) => p.toString() !== req.user._id.toString()
        );
        const initialStatus = recipient && presence.isOnline(recipient.toString()) ? 'delivered' : 'sent';

        let messageType = 'text';
        let attachment = null;

        if (file) {
            const category = file.attachmentCategory;
            const sizeLimit = category === 'image' ? IMAGE_MAX_SIZE : FILE_MAX_SIZE;

            if (file.size > sizeLimit) {
                return res.status(400).json({ message: 'File is too large.' });
            }

            const resourceType = category === 'image' ? 'image' : 'raw';
            const ext = getExtension(file.originalname);
            const publicId = `${req.user._id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${resourceType === 'raw' ? ext : ''}`;
            try {
                cloudinaryResult = await uploadBufferToCloudinary(file.buffer, {
                    resourceType,
                    folder: `aura/attachments/${conversationId}`,
                    publicId,
                });
            } catch (uploadErr) {
                console.error('Cloudinary upload failed:', uploadErr.message);
                return res.status(502).json({ message: 'Upload failed. Please try again.' });
            }

            messageType = category;
            attachment = {
                url: cloudinaryResult.secure_url,
                publicId: cloudinaryResult.public_id,
                resourceType,
                originalName: sanitizeOriginalName(file.originalname),
                mimeType: file.mimetype,
                size: file.size,
            };
        }

        let message;
        try {
            message = await Message.create({
                conversation: conversationId,
                sender: req.user._id,
                content,
                messageType,
                attachment,
                status: initialStatus,
                replyTo,
            });
        } catch (createErr) {
            if (cloudinaryResult) {
                cloudinary.uploader
                    .destroy(cloudinaryResult.public_id, { resource_type: attachment.resourceType })
                    .catch((cleanupErr) => console.error('Cloudinary cleanup failed:', cleanupErr.message));
            }
            throw createErr;
        }

        membership.conversation.lastMessage = {
            messageId: message._id,
            content: message.content,
            preview: previewText(message),
            sender: req.user._id,
            createdAt: message.createdAt,
        };
        await membership.conversation.save();

        const payload = formatMessage(message);

        const io = req.app.get('io');
        if (io) {
            const participantRooms = membership.conversation.participants.map((p) => `user:${p.toString()}`);
            io.to(`conversation:${conversationId}`).to(participantRooms).emit('message:new', { message: payload });

            // PHASE 12 — recipient's unread badge for THIS conversation only.
            if (recipient) {
                const unreadCount = await messageStatus.getUnreadCount(recipient.toString(), conversationId);
                io.to(`user:${recipient.toString()}`).emit('conversation:unread', {
                    conversationId,
                    unreadCount,
                });
            }

            // PHASE 13 — notification, only when the recipient isn't
            // actively looking at this conversation right now (Section 5).
            // Wrapped in its own try/catch so a notification failure can
            // NEVER reach `next(err)` after the response may already be
            // on its way.
            if (recipient) {
                try {
                    const recipientId = recipient.toString();

                    if (!isViewingConversation(io, recipientId, conversationId)) {
                        const notification = await Notification.create({
                            user: recipientId,
                            type: 'message',
                            conversation: conversationId,
                            message: message._id,
                            sender: req.user._id,
                        });

                        const unreadNotifications = await Notification.countDocuments({
                            user: recipientId,
                            isRead: false,
                        });

                        io.to(`user:${recipientId}`).emit('notification:new', {
                            notification: formatNotification(notification, req.user),
                            unreadCount: unreadNotifications,
                        });
                    }
                } catch (notifyErr) {
                    if (notifyErr.code !== 11000) {
                        console.error('Notification creation failed:', notifyErr.message);
                    }
                }
            }
        }

        res.status(201).json({ message: payload });
    } catch (err) {
        next(err);
    }
}
async function editMessage(req, res, next) {
    try {
        if (!handleValidation(req, res)) return;
        const { conversationId, messageId } = req.params;
        const content = (req.body.content || '').trim();

        const membership = await verifyMembership(conversationId, req.user._id);
        if (membership.error) return res.status(membership.error).json({ message: membership.message });

        const message = await Message.findOne({ _id: messageId, conversation: conversationId });
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only edit your own messages' });
        }

        if (message.isDeleted) {
            return res.status(409).json({ message: 'This message was deleted and can no longer be edited' });
        }

        if (!content && !message.attachment) {
            return res.status(400).json({ message: 'Message cannot be empty' });
        }

        message.content = content;
        message.editedAt = new Date();
        await message.save();
        // PHASE 12 — deliberately no unread-count change/emit here: editing
        // never touches `status` or `isDeleted`, so the unread total for
        // either participant cannot move (Test 10).

        const conversation = membership.conversation;
        if (conversation.lastMessage?.messageId?.toString() === message._id.toString()) {
            conversation.lastMessage.content = message.content;
            conversation.lastMessage.preview = previewText(message);
            await conversation.save();
        }

        const payload = formatMessage(message);

        const io = req.app.get('io');
        if (io) {
            const participantRooms = membership.conversation.participants.map((p) => `user:${p.toString()}`);
            io.to(`conversation:${conversationId}`).to(participantRooms).emit('message:updated', { message: payload });
        }

        res.json({ message: payload });
    } catch (err) {
        next(err);
    }
}

async function deleteMessage(req, res, next) {
    try {
        if (!handleValidation(req, res)) return;
        const { conversationId, messageId } = req.params;

        const membership = await verifyMembership(conversationId, req.user._id);
        if (membership.error) return res.status(membership.error).json({ message: membership.message });

        const message = await Message.findOne({ _id: messageId, conversation: conversationId });
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only delete your own messages' });
        }

        if (message.isDeleted) {
            return res.json({ message: formatMessage(message) });
        }

        if (message.attachment?.publicId) {
            try {
                await cloudinary.uploader.destroy(message.attachment.publicId, {
                    resource_type: message.attachment.resourceType,
                });
            } catch (cleanupErr) {
                console.error('Cloudinary cleanup on delete failed:', cleanupErr.message);
            }
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        const wasPinned = message.isPinned;
        if (wasPinned) {
            message.isPinned = false;
            message.pinnedAt = null;
            message.pinnedBy = null;
        }
        await message.save();
        // unreadMatchStage excludes isDeleted messages, so this message stops
        // counting toward the recipient's unread total the instant it's
        // saved — we just have to tell them (below), since nothing else
        // will (PHASE 12 / Test 11).

        const conversation = membership.conversation;
        if (conversation.lastMessage?.messageId?.toString() === message._id.toString()) {
            conversation.lastMessage.content = '';
            conversation.lastMessage.preview = DELETED_PREVIEW_TEXT;
            await conversation.save();
        }

        const payload = formatMessage(message);

        const io = req.app.get('io');
        if (io) {
            const participantRooms = membership.conversation.participants.map((p) => `user:${p.toString()}`);
            io.to(`conversation:${conversationId}`).to(participantRooms).emit('message:deleted', {
                conversationId,
                messageId: message._id,
                deletedAt: message.deletedAt,
            });
            if (wasPinned) {
                io.to(`conversation:${conversationId}`).to(participantRooms).emit('message:unpinned', {
                    conversationId,
                    messageId: message._id,
                });
            }

            // PHASE 12 — recompute+push the recipient's unread count for this
            // conversation. The deleter is always message.sender, so the
            // "other participant" is exactly who might lose unread credit.
            const otherParticipant = membership.conversation.participants.find(
                (p) => p.toString() !== message.sender.toString()
            );
            if (otherParticipant) {
                const unreadCount = await messageStatus.getUnreadCount(otherParticipant.toString(), conversationId);
                io.to(`user:${otherParticipant.toString()}`).emit('conversation:unread', {
                    conversationId,
                    unreadCount,
                });
            }
        }

        res.json({ message: payload });
    } catch (err) {
        next(err);
    }
}

const DEFAULT_PINNED_LIMIT = 20; // PHASE 15
const MAX_PINNED_LIMIT = 50; // PHASE 15

// PHASE 15 — Pin a message.
// Uses ONE atomic conditional update instead of find-then-save: the filter
// itself (`isDeleted: { $ne: true }, isPinned: { $ne: true }`) is what
// enforces Section 4 ("no duplicate pin") and half of Section 27's race
// handling — a delete that commits first makes this update match nothing,
// and two simultaneous pin requests can only ever have one of them
// actually flip isPinned, so only one ever emits the socket event.
async function pinMessage(req, res, next) {
    try {
        if (!handleValidation(req, res)) return;
        const { conversationId, messageId } = req.params;

        const membership = await verifyMembership(conversationId, req.user._id);
        if (membership.error) return res.status(membership.error).json({ message: membership.message });

        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ message: 'Invalid message id' });
        }

        const pinnedAt = new Date();
        const message = await Message.findOneAndUpdate(
            {
                _id: messageId,
                conversation: conversationId,
                isDeleted: { $ne: true },
                isPinned: { $ne: true },
            },
            { $set: { isPinned: true, pinnedAt, pinnedBy: req.user._id } },
            { new: true }
        );

        if (!message) {
            // The atomic update matched nothing — find out why, without
            // assuming it was a race: not found / wrong conversation /
            // deleted / already pinned are all distinct responses.
            const existing = await Message.findOne({ _id: messageId, conversation: conversationId });
            if (!existing) return res.status(404).json({ message: 'Message not found' });
            if (existing.isDeleted) {
                return res.status(409).json({ message: 'Deleted messages cannot be pinned' });
            }
            // Already pinned — idempotent no-op (Section 4), no re-emit.
            return res.json({ message: formatMessage(existing) });
        }

        const payload = formatMessage(message);

        const io = req.app.get('io');
        if (io) {
            const participantRooms = membership.conversation.participants.map((p) => `user:${p.toString()}`);
            io.to(`conversation:${conversationId}`).to(participantRooms).emit('message:pinned', {
                conversationId,
                messageId: message._id,
                pinnedBy: req.user._id,
                pinnedAt,
            });
        }

        res.json({ message: payload });
    } catch (err) {
        next(err);
    }
}

// PHASE 15 — Unpin a message. Same atomic-conditional-update shape as
// pinMessage, keyed the other direction (`isPinned: true`), so it's
// naturally idempotent and race-safe against a concurrent unpin or delete.
async function unpinMessage(req, res, next) {
    try {
        if (!handleValidation(req, res)) return;
        const { conversationId, messageId } = req.params;

        const membership = await verifyMembership(conversationId, req.user._id);
        if (membership.error) return res.status(membership.error).json({ message: membership.message });

        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ message: 'Invalid message id' });
        }

        const message = await Message.findOneAndUpdate(
            { _id: messageId, conversation: conversationId, isPinned: true },
            { $set: { isPinned: false, pinnedAt: null, pinnedBy: null } },
            { new: true }
        );

        if (!message) {
            const existing = await Message.findOne({ _id: messageId, conversation: conversationId });
            if (!existing) return res.status(404).json({ message: 'Message not found' });
            // Already unpinned (or was auto-unpinned by a delete) — idempotent no-op.
            return res.json({ message: formatMessage(existing) });
        }

        const payload = formatMessage(message);

        const io = req.app.get('io');
        if (io) {
            const participantRooms = membership.conversation.participants.map((p) => `user:${p.toString()}`);
            io.to(`conversation:${conversationId}`).to(participantRooms).emit('message:unpinned', {
                conversationId,
                messageId: message._id,
            });
        }

        res.json({ message: payload });
    } catch (err) {
        next(err);
    }
}

// PHASE 15 — List a conversation's pinned messages, newest pin first
// (Section 17). Deliberately excludes isDeleted defensively even though a
// delete already clears isPinned itself — belt and suspenders, and cheap
// since it rides the same {conversation:1, isPinned:1, pinnedAt:-1} index.
async function getPinnedMessages(req, res, next) {
    try {
        if (!handleValidation(req, res)) return;
        const { conversationId } = req.params;
        const page = req.query.page || 1;
        const limit = Math.min(req.query.limit || DEFAULT_PINNED_LIMIT, MAX_PINNED_LIMIT);

        const membership = await verifyMembership(conversationId, req.user._id);
        if (membership.error) return res.status(membership.error).json({ message: membership.message });

        const filter = { conversation: conversationId, isPinned: true, isDeleted: { $ne: true } };
        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            Message.find(filter).sort({ pinnedAt: -1 }).skip(skip).limit(limit).lean(),
            Message.countDocuments(filter),
        ]);

        res.json({
            messages: messages.map((m) => formatMessage(m)),
            pagination: {
                page,
                limit,
                hasMore: skip + messages.length < total,
            },
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
  createOrGetConversation,
  getConversations,
  getConversationById,
  getMessages,
  searchMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
};