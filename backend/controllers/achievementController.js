const Achievement = require('../models/Achievement');
const AchievementTemplate = require('../models/AchievementTemplate');
const User = require('../models/User');

const XP_LEVELS = [0, 200, 500, 1000, 1800, 3000, 4500, 6500, 9000, 12000, Infinity];

const levelForXp = (xp) => {
  let level = 1;
  for (let i = 1; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i - 1]) level = i;
  }
  return level;
};

// @desc  Get achievements for current user
// @route GET /api/achievements
// @access Private
const getAchievements = async (req, res) => {
  try {
    const [catalog, earnedDocs] = await Promise.all([
      AchievementTemplate.find({}).lean(),
      Achievement.find({ user: req.user.id }).lean(),
    ]);

    const earnedMap = {};
    earnedDocs.forEach(a => { earnedMap[a.key] = a; });

    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };

    const all = catalog.map(template => ({
      _id: earnedMap[template.key]?._id || template.key,
      key: template.key,
      title: template.title,
      description: template.description,
      category: template.category,
      xpReward: template.xpReward,
      rarity: template.rarity,
      icon: template.icon,
      earned: Boolean(earnedMap[template.key]),
      earnedAt: earnedMap[template.key]?.createdAt || null,
    }));

    // earned first, then by rarity
    all.sort((a, b) => {
      if (a.earned !== b.earned) return a.earned ? -1 : 1;
      return (rarityOrder[a.rarity] || 3) - (rarityOrder[b.rarity] || 3);
    });

    res.json({
      success: true,
      achievements: all,
      total: all.length,
      earnedCount: earnedDocs.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Internal helper — award one achievement and add XP
// Internal helper — award one achievement and add XP. Returns an array of
// every achievement actually created this call: the primary one requested,
// plus any level_5/level_10 achievements triggered as a side effect of the
// XP gain crossing a level threshold. Always returns an array (possibly
// empty), never a single doc or null, so callers can safely spread it.
const awardAchievement = async (userId, key) => {
  const created = [];
  try {
    const template = await AchievementTemplate.findOne({ key }).lean();
    if (!template) return created;

    const existing = await Achievement.findOne({ user: userId, key });
    if (existing) return created;

    const doc = await Achievement.create({
      user: userId, key: template.key, title: template.title,
      description: template.description, category: template.category,
      xpReward: template.xpReward, rarity: template.rarity, icon: template.icon,
    });
    created.push(doc);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { xp: template.xpReward } },
      { new: true }
    );

    const newLevel = levelForXp(updatedUser.xp);
    if (newLevel !== updatedUser.level) {
      await User.findByIdAndUpdate(userId, { level: newLevel });
      if (newLevel >= 5) created.push(...await awardAchievement(userId, 'level_5'));
      if (newLevel >= 10) created.push(...await awardAchievement(userId, 'level_10'));
    }

    return created;
  } catch (err) {
    console.error('[award]', key, '— ERROR:', err.message);
    return created;
  }
};

// Call after skill create/update — now returns array of newly-earned achievements
const checkSkillAchievements = async (userId, skillCount, skills) => {
  const results = [];
  const check = async (key) => { results.push(...await awardAchievement(userId, key)); };

  if (skillCount >= 1) await check('first_skill');
  if (skillCount >= 5) await check('five_skills');
  if (skillCount >= 10) await check('ten_skills');
  if (skillCount >= 20) await check('twenty_skills');

  const expertCount = (skills || []).filter(s => s.level >= 5).length;
  if (expertCount >= 1) await check('expert_skill');
  if (expertCount >= 5) await check('five_expert');

  const cats = new Set((skills || []).map(s => s.category)).size;
  if (cats >= 5) await check('all_categories');

  return results;
};

// Call after goal create/update — same pattern
const checkGoalAchievements = async (userId, goals) => {
  const results = [];
  const check = async (key) => { results.push(...await awardAchievement(userId, key)); };

  const total = goals.length;
  const completed = goals.filter(g => g.status === 'done').length;
  const highDone = goals.filter(g => g.status === 'done' && g.priority === 'high').length;

  if (total >= 1) await check('first_goal');
  if (total >= 5) await check('five_goals');
  if (completed >= 1) await check('first_goal_done');
  if (completed >= 5) await check('five_goals_done');
  if (completed >= 10) await check('ten_goals_done');
  if (highDone >= 1) await check('high_priority');

  const earnedCount = await Achievement.countDocuments({ user: userId });
  if (earnedCount >= 10) await check('completionist');

  return results;
};

// Call after computing a career match percentage (curated match or AI explore)
const checkCareerAchievements = async (userId, matchPercent) => {
  const results = [];
  const check = async (key) => { results.push(...await awardAchievement(userId, key)); };

  if (matchPercent >= 50)  await check('career_match_50');
  if (matchPercent >= 80)  await check('career_match_80');
  if (matchPercent >= 100) await check('career_match_100');

  return results;
};

module.exports = {
  getAchievements,
  awardAchievement,
  checkSkillAchievements,
  checkGoalAchievements,
  checkCareerAchievements,
};