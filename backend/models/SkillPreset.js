const mongoose = require('mongoose');

const skillPresetSchema = new mongoose.Schema({
  category: { type: String, required: true, unique: true, index: true },
  presets: [String],
});

module.exports = mongoose.model('SkillPreset', skillPresetSchema);