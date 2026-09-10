const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const presence = require('../socket/presence');

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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function searchUsers(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    let { q, page, limit } = req.query;
    q = q.trim().replace(/^@/, '');
    if (!q) return res.status(400).json({ message: 'Search query is required' });

    page = page || 1;
    limit = Math.min(limit || DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const safeQuery = escapeRegex(q);
    const regex = new RegExp(safeQuery, 'i');

    const filter = {
      _id: { $ne: req.user._id },
      $or: [{ name: regex }, { username: regex }],
    };

    const [users, total] = await Promise.all([
      User.find(filter).select('name username profilePicture').skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      users: users.map((u) => ({
        id: u._id,
        name: u.name,
        username: u.username,
        profilePicture: u.profilePicture,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getPublicProfile(req, res, next) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const user = await User.findById(userId).select('name username bio profilePicture lastSeen');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        bio: user.bio,
        profilePicture: user.profilePicture,
        online: presence.isOnline(user._id),
        lastSeen: user.lastSeen,
        isSelf: user._id.toString() === req.user._id.toString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getUserPresence(req, res, next) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    if (presence.isOnline(userId)) {
      return res.json({ online: true, lastSeen: null });
    }

    const user = await User.findById(userId).select('lastSeen');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ online: false, lastSeen: user.lastSeen });
  } catch (err) {
    next(err);
  }
}

module.exports = { searchUsers, getPublicProfile, getUserPresence };