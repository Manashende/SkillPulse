/**
 * Seeds the 21 achievement templates into MongoDB. Safe to re-run — uses
 * upsert by key, so running it again just updates existing entries rather
 * than duplicating them (e.g. if you tweak an xpReward or description later).
 *
 * Usage: node utils/seedAchievementTemplates.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const AchievementTemplate = require('../models/AchievementTemplate');

const CATALOG = [
  // Skills
  { key: 'first_skill',    title: 'First Step',      description: 'Added your very first skill to your profile',           category: 'skills',  xpReward: 50,  rarity: 'common',    icon: '◈' },
  { key: 'five_skills',    title: 'Skill Collector', description: 'Added 5 skills — building a solid foundation',          category: 'skills',  xpReward: 100, rarity: 'common',    icon: '◈' },
  { key: 'ten_skills',     title: 'Skill Hoarder',   description: 'Added 10 skills — your profile is getting impressive',  category: 'skills',  xpReward: 200, rarity: 'rare',      icon: '◈' },
  { key: 'twenty_skills',  title: 'Skill Master',    description: 'Added 20 skills — you are a well-rounded developer',    category: 'skills',  xpReward: 350, rarity: 'epic',      icon: '◈' },
  { key: 'expert_skill',   title: 'Expert Level',    description: 'Reached Expert (Level 5) in any skill',                 category: 'skills',  xpReward: 150, rarity: 'rare',      icon: '★' },
  { key: 'five_expert',    title: 'Polymath',        description: 'Reached Expert level in 5 different skills',            category: 'skills',  xpReward: 400, rarity: 'legendary', icon: '★' },
  { key: 'all_categories', title: 'Full Stack Mind', description: 'Added skills in 5 or more different categories',        category: 'skills',  xpReward: 300, rarity: 'epic',      icon: '◉' },
  // Goals
  { key: 'first_goal',      title: 'Goal Setter',  description: 'Created your first goal — the journey begins!', category: 'goals', xpReward: 50,  rarity: 'common',    icon: '◉' },
  { key: 'first_goal_done', title: 'Goal Crusher', description: 'Completed your very first goal — well done!',   category: 'goals', xpReward: 150, rarity: 'rare',      icon: '●' },
  { key: 'five_goals',      title: 'Ambitious',    description: 'Created 5 goals — you know what you want',      category: 'goals', xpReward: 100, rarity: 'common',    icon: '◉' },
  { key: 'five_goals_done', title: 'Unstoppable',  description: 'Completed 5 goals — you are on a roll!',        category: 'goals', xpReward: 300, rarity: 'epic',      icon: '●' },
  { key: 'ten_goals_done',  title: 'Legend',       description: 'Completed 10 goals — absolutely legendary!',    category: 'goals', xpReward: 500, rarity: 'legendary', icon: '🏆' },
  { key: 'high_priority',   title: 'No Shortcuts', description: 'Completed a High Priority goal',                category: 'goals', xpReward: 200, rarity: 'rare',      icon: '⚡' },
  // Career
  { key: 'career_match_50',  title: 'Half Way There', description: 'Achieved 50%+ match with any career path',  category: 'career', xpReward: 100, rarity: 'common',    icon: '◑' },
  { key: 'career_match_80',  title: 'Career Ready',   description: 'Achieved 80%+ match with a career path!',   category: 'career', xpReward: 300, rarity: 'epic',      icon: '◎' },
  { key: 'career_match_100', title: 'Dream Achieved', description: 'Achieved 100% match with a career path!',   category: 'career', xpReward: 600, rarity: 'legendary', icon: '🎯' },
  // Profile
  { key: 'profile_complete', title: 'Identity Formed', description: 'Filled in bio, location, and social links', category: 'profile', xpReward: 75,  rarity: 'common',    icon: '◎' },
  { key: 'level_5',          title: 'Rising Star',     description: 'Reached Level 5 on SkillPulse',             category: 'profile', xpReward: 250, rarity: 'rare',      icon: '★' },
  { key: 'level_10',         title: 'Veteran',         description: 'Reached Level 10 on SkillPulse',            category: 'profile', xpReward: 500, rarity: 'legendary', icon: '★' },
  // Special
  { key: 'early_adopter', title: 'Early Adopter', description: 'One of the first users of SkillPulse — thank you!', category: 'special', xpReward: 100, rarity: 'legendary', icon: '✨' },
  { key: 'completionist', title: 'Completionist', description: 'Earned 10 achievements — you love checking boxes!', category: 'special', xpReward: 400, rarity: 'epic',      icon: '★' },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  for (const template of CATALOG) {
    await AchievementTemplate.findOneAndUpdate(
      { key: template.key },
      template,
      { upsert: true }
    );
    console.log(`✓ ${template.title}`);
  }

  console.log(`Done — seeded ${CATALOG.length} achievement templates.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});