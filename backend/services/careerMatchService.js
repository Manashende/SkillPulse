const Career = require('../models/Career');
const Skill = require('../models/Skill');

// Shared by careerController (full match list) and skillController (achievement
// side-effect check) so the match% formula lives in exactly one place.
const computeTopCareerMatchPercent = async (userId) => {
  const [careers, userSkills] = await Promise.all([
    Career.find({}),
    Skill.find({ user: userId }),
  ]);

  const skillMap = {};
  userSkills.forEach(s => { skillMap[s.name.toLowerCase()] = s.level; });

  let best = 0;
  careers.forEach(career => {
    const required = career.requiredSkills;
    if (!required.length) return;
    let totalWeight = 0, earnedWeight = 0;
    required.forEach(r => {
      const w = r.weight || 1;
      totalWeight += w;
      if ((skillMap[r.name.toLowerCase()] || 0) >= r.minLevel) earnedWeight += w;
    });
    const pct = Math.round((earnedWeight / totalWeight) * 100);
    if (pct > best) best = pct;
  });

  return best;
};

module.exports = { computeTopCareerMatchPercent };