// backend/utils/otpEmail.js
//
// Sends the signup email-verification OTP via mailer.js (Brevo HTTPS API —
// see that file's comment for why this replaced raw SMTP).

const { sendEmail } = require('./mailer');

const sendOtpEmail = async (to, otpCode) => {
  await sendEmail({
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

const sendPasswordResetEmail = async (to, otpCode) => {
  await sendEmail({
    to,
    subject: 'Reset your SkillPulse password',
    text:
      `Your SkillPulse password reset code is: ${otpCode}\n\n` +
      `This code expires in 10 minutes. If you didn't request this, you can safely ignore this email — your password won't change.`,
    html:
      `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">` +
      `<h2 style="color:#FF5A5A;">Reset your SkillPulse password</h2>` +
      `<p>Your reset code is:</p>` +
      `<p style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1e1a16;">${otpCode}</p>` +
      `<p style="color:#888; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email — your password won't change.</p>` +
      `</div>`,
  });
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

module.exports = { sendOtpEmail, sendPasswordResetEmail, generateOtp };