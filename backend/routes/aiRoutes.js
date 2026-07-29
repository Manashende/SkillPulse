const express = require('express');
const { protect } = require('../middleware/auth');
const { callGemini } = require('../services/geminiService');
const { aiRateLimiter, aiHourlyLimiter } = require('../middleware/aiRateLimit');
const router = express.Router();

router.use(protect);
router.use(aiRateLimiter, aiHourlyLimiter);

// POST /api/ai/generate
// Body: { prompt: string, temperature?: number, maxOutputTokens?: number, thinkingBudget?: number }
router.post('/generate', async (req, res) => {
  try {
    const { prompt, temperature, maxOutputTokens, thinkingBudget } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, message: 'prompt (string) is required' });
    }

    const text = await callGemini(prompt, { temperature, maxOutputTokens, thinkingBudget });
    res.json({ success: true, text });
  } catch (err) {
    console.error('AI generate error:', err.message);
    res.status(502).json({ success: false, message: err.message || 'Gemini request failed' });
  }
});

module.exports = router;