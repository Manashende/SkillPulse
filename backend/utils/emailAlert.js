// backend/utils/emailAlert.js
//
// Best-effort same-day email alert when a Gemini API key dies. Silently
// no-ops (just logs a warning) if SMTP env vars aren't set, so this never
// blocks the actual request path if you haven't configured it yet.
//
// Works with any SMTP provider — Gmail (needs an "app password", not your
// normal password), Brevo's free tier, SendGrid's SMTP relay, etc.
// Set these to turn it on:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL_TO
//
// Requires: npm install nodemailer

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

const sendKeyFailureAlert = async ({ keyMasked, reason, deadCount, totalKeys }) => {
  const to = process.env.ALERT_EMAIL_TO;
  const t = getTransporter();
  if (!t || !to) {
    console.warn('[Gemini] Key failure alert not sent — SMTP_* / ALERT_EMAIL_TO not configured.');
    return;
  }

  const allDead = deadCount >= totalKeys;

  try {
    await t.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: allDead
        ? '\uD83D\uDD34 SkillPulse: ALL Gemini API keys are down'
        : `\u26A0\uFE0F SkillPulse: Gemini API key ${keyMasked} failed`,
      text: allDead
        ? `All ${totalKeys} Gemini API keys have failed. AI features are currently unavailable to users.\n\nLast failure: ${reason}`
        : `Gemini API key ${keyMasked} failed and has been rotated out.\n\nReason: ${reason}\nKeys remaining: ${totalKeys - deadCount}/${totalKeys}`,
    });
  } catch (mailErr) {
    console.error('[Gemini] Failed to send key-failure alert email:', mailErr.message);
  }
};

module.exports = { sendKeyFailureAlert };