const Skill = require('../models/Skill');
const SkillPreset = require('../models/SkillPreset');
const { computeTopCareerMatchPercent } = require('../services/careerMatchService');
const { checkSkillAchievements, checkCareerAchievements } = require('./achievementController');

const getSkillPresets = async (req, res, next) => {
  try {
    const docs = await SkillPreset.find({}).lean();
    const byCategory = {};
    docs.forEach(p => { byCategory[p.category] = p.presets; });
    res.json({ success: true, presets: byCategory });
  } catch (e) { next(e); }
};

const getSkills = async (req, res, next) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.category) filter.category = req.query.category;
    const skills = await Skill.find(filter).sort({ createdAt: -1 });
    const byCategory = {};
    skills.forEach(s => { if (!byCategory[s.category]) byCategory[s.category] = []; byCategory[s.category].push(s); });
    res.json({ success: true, count: skills.length, skills, byCategory });
  } catch (e) { next(e); }
};

const addSkill = async (req, res, next) => {
  try {
    const skill = await Skill.create({ ...req.body, user: req.user._id });
    const skills = await Skill.find({ user: req.user._id });
    const newAchievements = await checkSkillAchievements(req.user._id, skills.length, skills);

    const topMatch = await computeTopCareerMatchPercent(req.user._id);
    const careerAchievements = await checkCareerAchievements(req.user._id, topMatch);
    newAchievements.push(...careerAchievements);

    res.status(201).json({ success: true, skill, newAchievements });
  } catch (e) { next(e); }
};

const updateSkill = async (req, res, next) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });
    if (skill.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    const updated = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    const skills = await Skill.find({ user: req.user._id });
    const newAchievements = await checkSkillAchievements(req.user._id, skills.length, skills);

    const topMatch = await computeTopCareerMatchPercent(req.user._id);
    const careerAchievements = await checkCareerAchievements(req.user._id, topMatch);
    newAchievements.push(...careerAchievements);

    res.json({ success: true, skill: updated, newAchievements });
  } catch (e) { next(e); }
};

const deleteSkill = async (req, res, next) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ success: false, message: 'Skill not found' });
    if (skill.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' });
    await skill.deleteOne();
    res.json({ success: true, message: 'Skill deleted' });
  } catch (e) { next(e); }
};

const getSkillStats = async (req, res, next) => {
  try {
    const stats = await Skill.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$category', avgLevel: { $avg: '$level' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json({ success: true, stats });
  } catch (e) { next(e); }
};

module.exports = { getSkills, addSkill, updateSkill, deleteSkill, getSkillStats, getSkillPresets };