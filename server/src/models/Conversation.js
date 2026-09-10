const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ],
    key: { type: String, required: true, unique: true },
    lastMessage: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }, // PHASE 11
      content: { type: String, default: '' },
      preview: { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date },
    },
  },
  { timestamps: true }
);

conversationSchema.statics.buildKey = function (idA, idB) {
  return [idA.toString(), idB.toString()].sort().join('_');
};

module.exports = mongoose.model('Conversation', conversationSchema);