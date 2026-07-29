// backend/utils/otpEmail.js
//
// Sends the signup email-verification OTP. Uses the same SMTP env vars
// as emailAlert.js (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) — no new
// configuration needed if key-failure alerts are already set up.
//
// Unlike emailAlert.js, this one throws on failure rather than silently
// warning — an OTP email that doesn't send means the user is stuck and
// register() must know so it can tell them, instead of leaving them
// waiting on a code that never arrives.

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
};

const sendOtpEmail = async (to, otpCode) => {
  const t = getTransporter();
  if (!t) {
    throw new Error('Email sending is not configured on the server — contact support.');
  }

  await t.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: 'Verify your SkillPulse account',
    text:
      `Your SkillPulse verification code is: ${otpCode}\n\n` +
      `This code expires in 10 minutes. If you didn't create a SkillPulse account, you can ignore this email.`,
    html:
      `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">` +
      `<h2 style="color:#FF5A5A;">Verify your SkillPulse account</h2>` +
      `<p>Your verification code is:</p>` +
      `<p style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e1a16;">${otpCode}</p>` +
      `<p style="color:#888; font-size: 13px;">This code expires in 10 minutes. If you didn't create a SkillPulse account, you can ignore this email.</p>` +
      `</div>`,
  });
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

module.exports = { sendOtpEmail, generateOtp };