const { validationResult } = require('express-validator');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendOtpEmail, sendPasswordResetEmail, generateOtp } = require('../utils/otpEmail');

const OTP_EXPIRY_MS = 10 * 60 * 1000;   // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds between resends

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
    const { name, email, password } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ success: false, message: 'Email already registered' });

    const otpCode = generateOtp();
    const user = await User.create({
      name, email, password,
      isVerified: false,
      otpCode,
      otpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      otpLastSentAt: new Date(),
    });

    try {
      await sendOtpEmail(user.email, otpCode);
    } catch (mailErr) {
      // User row now exists but with no working way to verify it — safest
      // is to remove it rather than leave a stuck, unverifiable account
      // blocking that email address from ever registering again.
      await User.findByIdAndDelete(user._id);
      return res.status(502).json({ success: false, message: 'Could not send verification email — please try registering again in a moment.' });
    }

    // Deliberately no token here — verifyOtp is the only path that issues one.
    res.status(201).json({ success: true, needsVerification: true, email: user.email });
  } catch (error) { next(error); }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and code are required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'No account found for that email' });

    if (user.isVerified) {
      // Already verified (e.g. they double-submitted) — just log them in
      // rather than erroring, so a duplicate click doesn't strand them.
      user.lastActive = new Date();
      await user.save({ validateBeforeSave: false });
      return res.json({ success: true, token: generateToken(user._id), user: { _id: user._id, name: user.name, email: user.email, theme: user.theme, xp: user.xp } });
    }

    if (!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Code has expired — request a new one' });
    }

    if (user.otpCode !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: 'Incorrect code — please try again' });
    }

    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, token: generateToken(user._id), user: { _id: user._id, name: user.name, email: user.email, theme: user.theme, xp: user.xp } });
  } catch (error) { next(error); }
};

const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'No account found for that email' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'This account is already verified' });

    if (user.otpLastSentAt && Date.now() - user.otpLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - user.otpLastSentAt.getTime())) / 1000);
      return res.status(429).json({ success: false, message: `Please wait ${waitSeconds}s before requesting another code` });
    }

    const otpCode = generateOtp();
    user.otpCode = otpCode;
    user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    user.otpLastSentAt = new Date();
    await user.save({ validateBeforeSave: false });

    await sendOtpEmail(user.email, otpCode);
    res.json({ success: true, message: 'A new code has been sent' });
  } catch (error) { next(error); }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email });
    // Deliberately the same "not found" wording as resendOtp, for
    // consistency — this app already reveals account existence elsewhere,
    // so there's no new information leak introduced here.
    if (!user) return res.status(404).json({ success: false, message: 'No account found for that email' });

    if (user.otpLastSentAt && Date.now() - user.otpLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - user.otpLastSentAt.getTime())) / 1000);
      return res.status(429).json({ success: false, message: `Please wait ${waitSeconds}s before requesting another code` });
    }

    const otpCode = generateOtp();
    user.otpCode = otpCode;
    user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    user.otpLastSentAt = new Date();
    await user.save({ validateBeforeSave: false });

    await sendPasswordResetEmail(user.email, otpCode);
    res.json({ success: true, message: 'A reset code has been sent to your email' });
  } catch (error) { next(error); }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, code, and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'No account found for that email' });

    if (!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Code has expired — request a new one' });
    }
    if (user.otpCode !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: 'Incorrect code — please try again' });
    }

    user.password = newPassword; // pre-save hook hashes this automatically
    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) { next(error); }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Please verify your email before logging in', needsVerification: true, email: user.email });
    }

    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, token: generateToken(user._id), user: { _id: user._id, name: user.name, email: user.email, targetRole: user.targetRole, bio: user.bio, location: user.location, theme: user.theme, xp: user.xp, streakDays: user.streakDays, socialLinks: user.socialLinks } });
  } catch (error) { next(error); }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (error) { next(error); }
};

module.exports = { register, login, getMe, verifyOtp, resendOtp, forgotPassword, resetPassword };