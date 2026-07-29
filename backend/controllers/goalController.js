const Goal = require('../models/Goal');
const { checkGoalAchievements } = require('./achievementController');

const getGoals = async (req, res, next) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    const goals = await Goal.find(filter).sort({ createdAt: -1 });
    const kanban = { todo: [], 'in-progress': [], done: [] };
    goals.forEach(g => kanban[g.status].push(g));
    res.json({ success: true, count: goals.length, goals, kanban });
  } catch (e) { next(e); }
};

const createGoal = async (req, res, next) => {
  try {
    const goal = await Goal.create({ ...req.body, user: req.user._id });
    const goals = await Goal.find({ user: req.user._id });
    const newAchievements = await checkGoalAchievements(req.user._id, goals);
    res.status(201).json({ success: true, goal, newAchievements });
  } catch (e) { next(e); }
};

const updateGoal = async (req, res, next) => {
  try {
    const existing = await Goal.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Goal not found' });
    if (existing.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    const goal = await Goal.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
    const goals = await Goal.find({ user: req.user._id });
    const newAchievements = await checkGoalAchievements(req.user._id, goals);
    res.json({ success: true, goal, newAchievements });
  } catch (e) { next(e); }
};

const deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    if (goal.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    await goal.deleteOne();
    res.json({ success: true, message: 'Goal deleted' });
  } catch (e) { next(e); }
};

module.exports = { getGoals, createGoal, updateGoal, deleteGoal };