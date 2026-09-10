const User = require('../models/User');

function slugify(name) {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 12) || 'user'
  );
}

async function generateUniqueUsername(name) {
  const base = slugify(name);
  for (let i = 0; i < 15; i++) {
    const suffix = Math.floor(100 + Math.random() * 900);
    const candidate = `${base}${suffix}`.slice(0, 20);
    const exists = await User.findOne({ username: candidate });
    if (!exists) return candidate;
  }
  return `${base}${Date.now().toString().slice(-6)}`.slice(0, 20);
}

module.exports = { generateUniqueUsername, slugify };