// backend/utils/mailer.js
//
// Sends email via Brevo's HTTPS API instead of raw SMTP. Render (like most
// PaaS platforms) blocks outbound SMTP ports (25/465/587) by default —
// nodemailer over SMTP will always time out here regardless of DNS/IP-family
// fixes, because it's a platform firewall rule, not a connectivity bug.
// HTTPS (port 443) is never blocked, so an API-based provider is the correct
// fix rather than a workaround.
//
// Both otpEmail.js and emailAlert.js call this shared function.

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const sendEmail = async ({ to, subject, text, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    throw new Error('Email sending is not configured — set BREVO_API_KEY and BREVO_SENDER_EMAIL.');
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: 'SkillPulse' },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `Email send failed (HTTP ${res.status})`);
  }
};

module.exports = { sendEmail };