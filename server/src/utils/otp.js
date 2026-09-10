const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function generateOtpCode() {
  return crypto.randomInt(100000, 999999).toString();
}

async function hashOtp(code) {
  return bcrypt.hash(code, 10);
}

async function compareOtp(code, hash) {
  return bcrypt.compare(code, hash);
}

module.exports = { generateOtpCode, hashOtp, compareOtp };