const express = require('express');
const { protect } = require('../middleware/auth');
const Resume = require('../models/Resume');
const router = express.Router();

router.use(protect);

// GET /api/resume — returns the user's saved resume, or null if none exists yet
router.get('/', async (req, res) => {
  try {
    const resume = await Resume.findOne({ user: req.user._id }).lean();
    res.json({ success: true, resume: resume || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/resume — upsert (create on first save, update after)
router.put('/', async (req, res) => {
  try {
    const { template, targetRole, formData } = req.body;
    const resume = await Resume.findOneAndUpdate(
      { user: req.user._id },
      { template, targetRole, formData, updatedAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );
    res.json({ success: true, resume });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;