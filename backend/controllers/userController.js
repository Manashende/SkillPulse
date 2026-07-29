const User = require('../models/User');
const Skill = require('../models/Skill');
const Goal = require('../models/Goal');
const Achievement = require('../models/Achievement');
const Resume = require('../models/Resume');
const AgentChat = require('../models/AgentChat');

// XP needed to reach each level (cumulative)
const XP_THRESHOLDS = [0, 200, 500, 1000, 1800, 3000, 4500, 6500, 9000, 12000, Infinity];

const getXpToNextLevel = (xp, level) => {
  const nextThreshold = XP_THRESHOLDS[Math.min(level, 10)];
  return nextThreshold === Infinity ? 0 : Math.max(nextThreshold - xp, 0);
};

// @desc  Get user profile
// @route GET /api/users/profile
// @access Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update profile
// @route PUT /api/users/profile
// @access Private
const updateProfile = async (req, res) => {
  try {
    const { name, bio, location, github, linkedin } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { name, bio, location, github, linkedin } },
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

    // Award profile complete achievement
    let newAchievements = [];
    if (bio && location && (github || linkedin)) {
      const { awardAchievement } = require('./achievementController');
      newAchievements = await awardAchievement(req.user.id, 'profile_complete');
    }
    res.json({ success: true, user, newAchievements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Change password
// @route PUT /api/users/change-password
// @access Private
const changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { currentPassword, newPassword } = req.body;
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get dashboard stats — returns full user with counts
// @route GET /api/users/dashboard
// @access Private
const getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const [skillCount, goalCount, achCount, doneGoals] = await Promise.all([
      Skill.countDocuments({ user: req.user.id }),
      Goal.countDocuments({ user: req.user.id }),
      Achievement.countDocuments({ user: req.user.id }),
      Goal.countDocuments({ user: req.user.id, status: 'done' }),
    ]);

    const xp = user.xp || 0;
    const level = user.level || 1;
    const xpToNextLevel = getXpToNextLevel(xp, level);

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        skillCount,
        goalCount,
        achievementCount: achCount,
        completedGoals: doneGoals,
        xpToNextLevel,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete account
// @route DELETE /api/users/account
// @access Private
const deleteAccount = async (req, res) => {
  try {
    await Promise.all([
      Skill.deleteMany({ user: req.user.id }),
      Goal.deleteMany({ user: req.user.id }),
      Achievement.deleteMany({ user: req.user.id }),
      Resume.deleteOne({ user: req.user.id }),
      AgentChat.deleteOne({ user: req.user.id }),
    ]);
    await User.findByIdAndDelete(req.user.id);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getProfile, updateProfile, changePassword, getDashboard, deleteAccount };