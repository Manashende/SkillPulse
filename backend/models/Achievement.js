const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key:         { type: String, required: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  category:    { type: String, enum: ['skills','goals','career','profile','special'], default: 'special' },
  xpReward:    { type: Number, default: 50 },
  rarity:      { type: String, enum: ['common','rare','epic','legendary'], default: 'common' },
  icon:        { type: String, default: '★' },
}, { timestamps: true });

achievementSchema.index({ user: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Achievement', achievementSchema);