const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { generateToken, setTokenCookie } = require('../utils/generateToken');
const { generateUniqueUsername } = require('../utils/generateUsername');
const { generateOtpCode, hashOtp, compareOtp } = require('../utils/otp');
const { sendEmail, otpEmailTemplate } = require('../utils/sendEmail');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const OTP_EXPIRY_MINUTES = 10;

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    return false;
  }
  return true;
}

async function createAndSendOtp(userId, email, purpose) {
  await Otp.deleteMany({ userId, purpose, consumed: false });
  const code = generateOtpCode();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await Otp.create({ userId, codeHash, purpose, expiresAt });
  await sendEmail({
    to: email,
    subject: purpose === 'password_reset' ? 'Your AURA password reset code' : 'Verify your AURA account',
    html: otpEmailTemplate(code, purpose),
  });
}

async function register(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists' });

    const username = await generateUniqueUsername(name);
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
      username,
      authProvider: 'local',
      emailVerified: false,
    });

    await createAndSendOtp(user._id, user.email, 'email_verification');

    res.status(201).json({ message: 'Account created. Please verify your email.', email: user.email });
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (user.emailVerified) return res.status(400).json({ message: 'Email already verified' });

    const otpRecord = await Otp.findOne({ userId: user._id, purpose: 'email_verification', consumed: false }).sort({ createdAt: -1 });

    if (!otpRecord) return res.status(400).json({ message: 'No active code found. Please request a new one.' });
    if (otpRecord.expiresAt < new Date()) return res.status(400).json({ message: 'Code has expired. Please request a new one.' });
    if (otpRecord.attempts >= 5) return res.status(429).json({ message: 'Too many attempts. Please request a new code.' });

    const isMatch = await compareOtp(code, otpRecord.codeHash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    otpRecord.consumed = true;
    await otpRecord.save();

    user.emailVerified = true;
    await user.save();

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({ message: 'Email verified successfully', token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function resendOtp(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (user.emailVerified) return res.status(400).json({ message: 'Email already verified' });

    await createAndSendOtp(user._id, user.email, 'email_verification');
    res.json({ message: 'A new verification code has been sent to your email' });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || user.authProvider !== 'local') return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    if (!user.emailVerified) {
      await createAndSendOtp(user._id, user.email, 'email_verification');
      return res.status(403).json({ message: 'Please verify your email to continue', requiresVerification: true, email: user.email });
    }

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({ message: 'Logged in successfully', token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function googleAuth(req, res, next) {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential is required' });

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, email_verified } = payload;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      const username = await generateUniqueUsername(name || email.split('@')[0]);
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        username,
        googleId,
        authProvider: 'google',
        emailVerified: !!email_verified,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (email_verified) user.emailVerified = true;
      await user.save();
    }

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({ message: 'Logged in successfully', token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user && user.authProvider === 'local') {
      await createAndSendOtp(user._id, user.email, 'password_reset');
    }

    res.json({ message: 'If an account exists for this email, a reset code has been sent' });
  } catch (err) {
    next(err);
  }
}

async function verifyResetOtp(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid or expired code' });

    const otpRecord = await Otp.findOne({ userId: user._id, purpose: 'password_reset', consumed: false }).sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.expiresAt < new Date()) return res.status(400).json({ message: 'Code is invalid or has expired' });
    if (otpRecord.attempts >= 5) return res.status(429).json({ message: 'Too many attempts. Please request a new code.' });

    const isMatch = await compareOtp(code, otpRecord.codeHash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ message: 'Invalid code' });
    }

    res.json({ message: 'Code verified. You can now reset your password.' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid or expired code' });

    const otpRecord = await Otp.findOne({ userId: user._id, purpose: 'password_reset', consumed: false }).sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.expiresAt < new Date()) return res.status(400).json({ message: 'Code is invalid or has expired' });

    const isMatch = await compareOtp(code, otpRecord.codeHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid code' });

    otpRecord.consumed = true;
    await otpRecord.save();

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ message: 'Password reset successfully. Please sign in.' });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res) {
  res.json({ user: sanitizeUser(req.user) });
}

async function logout(req, res) {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
}

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
  };
}

module.exports = { register, verifyEmail, resendOtp, login, googleAuth, forgotPassword, verifyResetOtp, resetPassword, getMe, logout };