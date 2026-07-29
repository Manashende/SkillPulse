const express = require('express');
const { protect } = require('../middleware/auth');
const { runAgent, getHistory, saveHistory, clearHistory } = require('../controllers/agentController');
const { aiRateLimiter, aiHourlyLimiter } = require('../middleware/aiRateLimit');

const router = express.Router();

router.use(protect);
router.use(aiRateLimiter, aiHourlyLimiter);


// POST /api/agent/run
router.post('/run', runAgent);

// GET /api/agent/history
router.get('/history', getHistory);

// PUT /api/agent/history
router.put('/history', saveHistory);

// DELETE /api/agent/history
router.delete('/history', clearHistory);

module.exports = router;