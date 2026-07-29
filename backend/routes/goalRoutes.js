const express = require('express');
const { body } = require('express-validator');
const { getGoals, createGoal, updateGoal, deleteGoal } = require('../controllers/goalController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.route('/')
  .get(getGoals)
  .post([body('title').trim().notEmpty().withMessage('Title required')], createGoal);
router.route('/:id').put(updateGoal).delete(deleteGoal);
module.exports = router;