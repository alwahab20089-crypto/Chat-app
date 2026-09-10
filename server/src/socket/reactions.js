const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { ALLOWED_EMOJIS } = require('../utils/reactionPolicy');

async function verifyAccess(conversationId, messageId, userId) {
  if (
    !mongoose.Types.ObjectId.isValid(conversationId) ||
    !mongoose.Types.ObjectId.isValid(messageId)
  ) {
    return { error: 'Invalid id' };
  }

  const conversation = await Conversation.findById(conversationId).select('participants');
  if (!conversation) return { error: 'Conversation not found' };

  const isParticipant = conversation.participants.some((p) => p.toString() === userId.toString());
  if (!isParticipant) return { error: 'Not a participant' };

  const message = await Message.findOne({ _id: messageId, conversation: conversationId }).select('_id isDeleted'); // PHASE 11
  if (!message) return { error: 'Message not found' };
  if (message.isDeleted) return { error: 'This message is no longer available' }; // PHASE 11

  return { conversation };
}
// Add / change / remove — all in ONE atomic aggregation-pipeline update.
// The new reactions array is computed entirely by MongoDB from the current
// document state, so there's no read-then-write race window: two users
// (or two taps from the same user) reacting at the same instant can never
// clobber each other, because the whole computation happens server-side
// inside a single atomic document update.
//
// Logic (mirrors sections 6/7/8):
//   - user has no reaction yet            -> append {userId, emoji}
//   - user's existing reaction == emoji   -> remove it (toggle off)
//   - user's existing reaction != emoji   -> replace it with the new emoji
async function toggleReaction(conversationId, messageId, userId, emoji) {
  if (!ALLOWED_EMOJIS.includes(emoji)) {
    return { error: 'Unsupported emoji' };
  }

  const access = await verifyAccess(conversationId, messageId, userId);
  if (access.error) return { error: access.error };

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const messageObjectId = new mongoose.Types.ObjectId(messageId);

  const pipeline = [
    {
      $set: {
        reactions: {
          $let: {
            vars: {
              existingEmoji: {
                $arrayElemAt: [
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: '$reactions',
                          as: 'r',
                          cond: { $eq: ['$$r.userId', userObjectId] },
                        },
                      },
                      as: 'r',
                      in: '$$r.emoji',
                    },
                  },
                  0,
                ],
              },
            },
            in: {
              $cond: [
                { $eq: ['$$existingEmoji', emoji] },
                // same emoji tapped again -> remove this user's reaction
                {
                  $filter: {
                    input: '$reactions',
                    as: 'r',
                    cond: { $ne: ['$$r.userId', userObjectId] },
                  },
                },
                // no reaction yet, or a different one -> drop any old
                // entry for this user and append the new one
                {
                  $concatArrays: [
                    {
                      $filter: {
                        input: '$reactions',
                        as: 'r',
                        cond: { $ne: ['$$r.userId', userObjectId] },
                      },
                    },
                    [{ userId: userObjectId, emoji }],
                  ],
                },
              ],
            },
          },
        },
      },
    },
  ];

  // Using the native MongoDB driver's collection here instead of the
  // Mongoose query builder — aggregation-pipeline updates are fully
  // supported at the driver level, and this sidesteps Mongoose-version-
  // specific guards around passing an array as an update.
  const raw = await Message.collection.findOneAndUpdate(
    { _id: messageObjectId },
    pipeline,
    { returnDocument: 'after', projection: { reactions: 1 } }
  );

  // Older driver versions wrap the doc in `.value`; newer ones return it
  // directly — handle both so this isn't tied to one driver version either.
  const updatedDoc = raw && raw.value !== undefined ? raw.value : raw;

  if (!updatedDoc) return { error: 'Message not found' };

  return {
    reactions: (updatedDoc.reactions || []).map((r) => ({
      userId: r.userId.toString(),
      emoji: r.emoji,
    })),
    participantIds: access.conversation.participants.map((p) => p.toString()),
  };
}
module.exports = { toggleReaction };