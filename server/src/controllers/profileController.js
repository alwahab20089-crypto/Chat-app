const { validationResult } = require('express-validator');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

const USERNAME_COOLDOWN_DAYS = 7;
const NAME_COOLDOWN_DAYS = 7;
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'profile-pictures');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    username: user.username,
    profilePicture: user.profilePicture,
    bio: user.bio,
    authProvider: user.authProvider,
    emailVerified: user.emailVerified,
    lastUsernameChangeAt: user.lastUsernameChangeAt,
    lastNameChangeAt: user.lastNameChangeAt,
  };
}

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: errors.array()[0].msg });
    return false;
  }
  return true;
}

async function getProfile(req, res) {
  res.json({ user: sanitizeUser(req.user) });
}

async function updateBio(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const { bio } = req.body;
    req.user.bio = (bio || '').trim();
    await req.user.save();
    res.json({ message: 'Bio updated', user: sanitizeUser(req.user) });
  } catch (err) {
    next(err);
  }
}

async function updateName(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const { name } = req.body;
    const user = req.user;

    if (user.lastNameChangeAt) {
      const nextAllowed = new Date(user.lastNameChangeAt.getTime() + NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
      if (nextAllowed > new Date()) {
        const msRemaining = nextAllowed - new Date();
        const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
        return res.status(429).json({
          message: `Name can be changed again in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`,
          nextAllowedAt: nextAllowed,
        });
      }
    }

    if (name === user.name) return res.status(400).json({ message: 'This is already your name' });

    user.name = name;
    user.lastNameChangeAt = new Date();
    await user.save();

    res.json({ message: 'Name updated', user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function updateUsername(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const { username } = req.body;
    const user = req.user;

    if (user.lastUsernameChangeAt) {
      const nextAllowed = new Date(user.lastUsernameChangeAt.getTime() + USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
      if (nextAllowed > new Date()) {
        const msRemaining = nextAllowed - new Date();
        const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
        return res.status(429).json({
          message: `Username can be changed again in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`,
          nextAllowedAt: nextAllowed,
        });
      }
    }

    if (username === user.username) return res.status(400).json({ message: 'This is already your username' });

    const exists = await User.findOne({ username, _id: { $ne: user._id } });
    if (exists) return res.status(409).json({ message: 'This username is already taken' });

    user.username = username;
    user.lastUsernameChangeAt = new Date();
    await user.save();

    res.json({ message: 'Username updated', user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function uploadProfilePicture(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });

    let metadata;
    try {
      metadata = await sharp(req.file.buffer).metadata();
      if (!metadata.format) throw new Error('Unrecognized image');
    } catch {
      return res.status(400).json({ message: 'Uploaded file is not a valid image' });
    }

    const filename = `${req.user._id}-${Date.now()}.webp`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await sharp(req.file.buffer).resize(512, 512, { fit: 'cover' }).webp({ quality: 85 }).toFile(filepath);

    if (req.user.profilePicture && req.user.profilePicture.includes('/uploads/profile-pictures/')) {
      const oldPath = path.join(__dirname, '..', req.user.profilePicture.replace(/^\//, ''));
      fs.unlink(oldPath, () => {});
    }

    req.user.profilePicture = `/uploads/profile-pictures/${filename}`;
    await req.user.save();

    res.json({ message: 'Profile picture updated', user: sanitizeUser(req.user) });
  } catch (err) {
    next(err);
  }
}

async function removeProfilePicture(req, res, next) {
  try {
    if (req.user.profilePicture && req.user.profilePicture.includes('/uploads/profile-pictures/')) {
      const oldPath = path.join(__dirname, '..', req.user.profilePicture.replace(/^\//, ''));
      fs.unlink(oldPath, () => {});
    }
    req.user.profilePicture = '';
    await req.user.save();
    res.json({ message: 'Profile picture removed', user: sanitizeUser(req.user) });
  } catch (err) {
    next(err);
  }
}

async function deleteAccount(req, res, next) {
  try {
    if (req.user.profilePicture && req.user.profilePicture.includes('/uploads/profile-pictures/')) {
      const oldPath = path.join(__dirname, '..', req.user.profilePicture.replace(/^\//, ''));
      fs.unlink(oldPath, () => {});
    }
    await User.findByIdAndDelete(req.user._id);
    res.clearCookie('token');
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateBio, updateName, updateUsername, uploadProfilePicture, removeProfilePicture, deleteAccount };