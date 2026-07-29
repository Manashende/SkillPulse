const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  template: { type: String, default: 'modern' },
  targetRole: { type: String, default: '' },
  formData: { type: mongoose.Schema.Types.Mixed, default: {} }, // full form object as-is
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Resume', resumeSchema);