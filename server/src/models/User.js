const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {
      type: String,
      select: false
    },

    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20
    },

    profilePicture: {
      type: String,
      default: ''
    },

    bio: {
      type: String,
      default: '',
      maxlength: 160
    },

    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },

    googleId: {
      type: String,
      default: null
    },

    emailVerified: {
      type: Boolean,
      default: false
    },

    lastUsernameChangeAt: {
      type: Date,
      default: null
    },

    lastNameChangeAt: {
      type: Date,
      default: null
    },
    lastSeen: {
      type: Date,
      default: null
    },
  },
  { timestamps: true }
);
userSchema.index({ name: 1 });
module.exports = mongoose.model('User', userSchema);