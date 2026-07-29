const Career = require('../models/Career');
const Skill = require('../models/Skill');
const ExploreCache = require('../models/ExploreCache');
const { callGemini, safeParseJSON } = require('../services/geminiService');
const { calculateLiveSalary } = require('../services/salaryService');
const EXPLORE_CACHE_TTL_DAYS = 60; // skill requirements barely change week to week
const { checkCareerAchievements } = require('./achievementController');

const getCareers = async (req, res, next) => {
  try {
    const careers = await Career.find(req.query.category ? { category: req.query.category } : {}).sort({ title: 1 });
    res.json({ success: true, count: careers.length, careers });
  } catch (e) { next(e); }
};

const getCareer = async (req, res, next) => {
  try {
    const career = await Career.findById(req.params.id);
    if (!career) return res.status(404).json({ success: false, message: 'Career not found' });
    res.json({ success: true, career });
  } catch (e) { next(e); }
};

const getCareerMatches = async (req, res, next) => {
  try {
    const [careers, userSkills] = await Promise.all([Career.find({}), Skill.find({ user: req.user._id })]);
    const skillMap = {};
    userSkills.forEach(s => { skillMap[s.name.toLowerCase()] = s.level; });
    const matches = careers.map(career => {
      const required = career.requiredSkills;
      if (!required.length) return { ...career.toObject(), matchPercent: 0, missingSkills: [] };
      let totalWeight = 0, earnedWeight = 0;
      const missingSkills = [], matchedSkills = [];
      required.forEach(r => {
        const w = r.weight || 1;
        totalWeight += w;
        const userLevel = skillMap[r.name.toLowerCase()] || 0;
        if (userLevel >= r.minLevel) { earnedWeight += w; matchedSkills.push({ name: r.name, userLevel, minLevel: r.minLevel }); }
        else missingSkills.push({ name: r.name, userLevel, minLevel: r.minLevel });
      });
      return { ...career.toObject(), matchPercent: Math.round((earnedWeight / totalWeight) * 100), missingSkills, matchedSkills };
    }).sort((a, b) => b.matchPercent - a.matchPercent);
    const topMatch = matches[0]?.matchPercent || 0;
    const newAchievements = await checkCareerAchievements(req.user._id, topMatch);
    res.json({ success: true, matches, newAchievements });
  } catch (e) { next(e); }
};

const getCareerExplore = async (req, res, next) => {
  try {
    const title = (req.query.title || '').trim();
    if (!title) {
      return res.status(400).json({ success: false, message: 'title query param is required' });
    }

    const cacheKey = title.toLowerCase();
    let skillReq = await ExploreCache.findOne({ key: cacheKey });
    const isFreshCache =
      skillReq &&
      Date.now() - new Date(skillReq.fetchedAt).getTime() < EXPLORE_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;

    if (!isFreshCache) {
      const prompt =
        `You are a career advisor. For the job title "${title}", list the 5 to 6 most ` +
        `important technical or professional skills required, each with a minimum ` +
        `proficiency level from 1 (beginner) to 5 (expert) typically expected for a ` +
        `competent candidate. Also classify the role into exactly one category from: ` +
        `Engineering, Design, Data, DevOps, Mobile, Management, Other. ` +
        `Respond ONLY with valid JSON in this exact shape, no markdown, no explanation:\n` +
        `{"category": "<one of the categories above>", "skills": [{"name": "<skill name>", "minLevel": <1-5>}]}`;

      const raw = await callGemini(prompt, { temperature: 0.3, maxOutputTokens: 800 });
      const parsed = safeParseJSON(raw);

      if (!parsed || !Array.isArray(parsed.skills) || parsed.skills.length === 0) {
        return res.status(502).json({
          success: false,
          message: 'Could not generate skill requirements for this title right now'
        });
      }

      skillReq = await ExploreCache.findOneAndUpdate(
        { key: cacheKey },
        {
          key: cacheKey,
          jobTitle: title,
          category: parsed.category || 'Other',
          skills: parsed.skills,
          fetchedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }

    // Reuse the exact same live salary + relative-demand logic curated careers use
    const salaryData = await calculateLiveSalary(title, skillReq.category);

    // Reuse the exact same match % formula getCareerMatches uses
    const userSkills = await Skill.find({ user: req.user._id });
    const skillMap = {};
    userSkills.forEach(s => { skillMap[s.name.toLowerCase()] = s.level; });

    let totalWeight = 0, earnedWeight = 0;
    const missingSkills = [], matchedSkills = [];
    skillReq.skills.forEach(r => {
      totalWeight += 1;
      const userLevel = skillMap[r.name.toLowerCase()] || 0;
      if (userLevel >= r.minLevel) {
        earnedWeight += 1;
        matchedSkills.push({ name: r.name, userLevel, minLevel: r.minLevel });
      } else {
        missingSkills.push({ name: r.name, userLevel, minLevel: r.minLevel });
      }
    });
    const matchPercent = totalWeight ? Math.round((earnedWeight / totalWeight) * 100) : 0;

    const newAchievements = await checkCareerAchievements(req.user._id, matchPercent);
    res.json({
      success: true,
      title,
      category: skillReq.category,
      requiredSkills: skillReq.skills,
      matchedSkills,
      missingSkills,
      matchPercent,
      salary: salaryData,
      skillsSource: 'ai-estimated',
      skillsGeneratedAt: skillReq.fetchedAt,
      newAchievements,
    });
  } catch (e) { next(e); }
};

// ============================================================
// UPDATE your module.exports line to include the new function:
// ============================================================
//
module.exports = { getCareers, getCareer, getCareerMatches, getCareerExplore };

