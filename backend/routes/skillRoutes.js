const express = require('express');
const { body } = require('express-validator');
const { getSkills, addSkill, updateSkill, deleteSkill, getSkillStats, getSkillPresets } = require('../controllers/skillController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.get('/stats', getSkillStats);
router.get('/presets', getSkillPresets);
router.route('/')
  .get(getSkills)
  .post([
    body('name').trim().notEmpty().withMessage('Skill name required'),
    body('category').notEmpty().withMessage('Category required'),
    body('level').isInt({ min: 1, max: 5 }).withMessage('Level must be 1-5'),
  ], addSkill);
router.route('/:id').put(updateSkill).delete(deleteSkill);
module.exports = router;