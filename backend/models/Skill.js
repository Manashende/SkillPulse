const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: true, trim: true },
  category: { type: String, required: true, enum: ['Frontend','Backend','Database','DevOps','Mobile','Design','Data Science','Soft Skills','Other'] },
  level:    { type: Number, required: true, min: 1, max: 5 },
  notes:    { type: String, default: '' },
}, { timestamps: true });

skillSchema.index({ user: 1, name: 1 }, { unique: true });
module.exports = mongoose.model('Skill', skillSchema);