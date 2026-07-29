const mongoose = require('mongoose');

const achievementTemplateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  xpReward: { type: Number, required: true },
  rarity: { type: String, required: true }, // "common" | "rare" | "epic" | "legendary"
  icon: { type: String, required: true },
});

module.exports = mongoose.model('AchievementTemplate', achievementTemplateSchema);