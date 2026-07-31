// backend/utils/emailAlert.js
//
// Best-effort same-day email alert when a Gemini API key dies. Sends via
// mailer.js (Brevo HTTPS API) — see mailer.js's comment for why this
// replaced raw SMTP (Render blocks outbound SMTP ports entirely).
//
// Unlike otpEmail.js, this stays best-effort: a failed alert email should
// never break the actual AI request path that triggered it, so failures
// are logged and swallowed rather than thrown.

const { sendEmail } = require('./mailer');

const sendKeyFailureAlert = async ({ keyMasked, reason, deadCount, totalKeys }) => {
  const to = process.env.ALERT_EMAIL_TO;
  if (!to) {
    console.warn('[Gemini] Key failure alert not sent — ALERT_EMAIL_TO not configured.');
    return;
  }

  const allDead = deadCount >= totalKeys;

  try {
    await sendEmail({
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