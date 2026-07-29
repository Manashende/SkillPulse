// backend/middleware/aiRateLimit.js
//
// One shared pair of limiters for every route that draws from the Gemini
// key pool (ai/generate, agent/run, ...). Both routes import THIS module,
// so the same limiter instances — and therefore the same counters — are
// shared across them; someone hammering two different AI features still
// hits one combined cap, not two independent ones.
//
// Keyed by req.user.id (not IP) since these routes already sit behind
// `protect` — IP-based limiting would unfairly throttle shared networks
// and wouldn't catch one user switching networks.
//
// Requires: npm install express-rate-limit

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const keyByUser = (req) => req.user?.id || ipKeyGenerator(req);

// Short-window guard: catches bursts (accidental double-clicks, a buggy
// retry loop, someone spamming a button).
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  handler: (req, res) => {
    const resetAt = req.rateLimit?.resetTime;
    const waitSeconds = resetAt ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) : 60;
    res.status(429).json({
      success: false,
      message: `You've reached the AI usage limit — try again in ${waitSeconds}s.`,
      retryAfter: resetAt ? resetAt.toISOString() : null,
    });
  },
});

// Long-window guard: catches sustained abuse a per-minute cap wouldn't
// (staying just under the per-minute limit for hours).
const aiHourlyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  handler: (req, res) => {
    const resetAt = req.rateLimit?.resetTime;
    const waitMinutes = resetAt ? Math.max(1, Math.ceil((resetAt - Date.now()) / 60000)) : 60;
    const recoverTimeStr = resetAt
      ? resetAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : null;
    res.status(429).json({
      success: false,
      message: recoverTimeStr
        ? `You've hit the hourly AI usage limit — it resets at ${recoverTimeStr}.`
        : `You've hit the hourly AI usage limit — try again in about ${waitMinutes} min.`,
      retryAfter: resetAt ? resetAt.toISOString() : null,
    });
  },
});

module.exports = { aiRateLimiter, aiHourlyLimiter };