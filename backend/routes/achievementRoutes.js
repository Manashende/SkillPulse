const express = require('express');
const { getAchievements } = require('../controllers/achievementController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', getAchievements);

module.exports = router;