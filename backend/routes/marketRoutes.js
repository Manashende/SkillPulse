const express = require('express');
const { protect } = require('../middleware/auth');
const { calculateLiveSalary } = require('../services/salaryService');
const { getLiveJobsPage } = require('../services/jobsService');
const router = express.Router();

router.use(protect);

// GET /market/jobs/:jobTitle?page=1
router.get('/jobs/:jobTitle', async (req, res) => {
  try {
    const title = req.params.jobTitle;
    const page = parseInt(req.query.page, 10) || 1;

    if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
      return res.status(500).json({ success: false, message: 'Adzuna API keys not configured in .env' });
    }

    const result = await getLiveJobsPage(title, page);

    if (!result) {
      return res.status(502).json({ success: false, message: 'Failed to fetch jobs from Adzuna' });
    }

    res.json({
      success: true,
      count: result.totalCount,
      page: result.page,
      jobs: result.jobs,
      source: result.source
    });
  } catch (error) {
    console.error('Market jobs error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch jobs: ' + error.message });
  }
});

// GET /market/salary/:jobTitle?category=Engineering
router.get('/salary/:jobTitle', async (req, res) => {
  try {
    const title = req.params.jobTitle;
    const category = req.query.category || null;

    const salaryData = await calculateLiveSalary(title, category);

    if (!salaryData) {
      return res.status(404).json({
        success: false,
        message: 'No live salary data available for this role right now'
      });
    }

    res.json({ success: true, ...salaryData });
  } catch (error) {
    console.error('Market salary error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch salary data' });
  }
});

module.exports = router;