const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  type:  { type: String, enum: ['article', 'video', 'website'], default: 'website' },
  title: { type: String, default: '' },
  url:   { type: String, default: '' },
}, { _id: false });

const stepSchema = new mongoose.Schema({
  text:          { type: String, required: true },
  estimatedDays: { type: Number, default: 1 },
  resources:     { type: [resourceSchema], default: [] },
  done:          { type: Boolean, default: false },
}, { _id: false });

const goalSchema = new mongoose.Schema({
  user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:            { type: String, required: true, trim: true },
  description:      { type: String, default: '' },
  linkedSkill:      { type: String, default: '' },
  status:           { type: String, enum: ['todo','in-progress','done'], default: 'todo' },
  priority:         { type: String, enum: ['low','medium','high'], default: 'medium' },
  progress:         { type: Number, min: 0, max: 100, default: 0 },
  deadline:         { type: Date, default: null },
  completedAt:      { type: Date, default: null },
  steps:            { type: [stepSchema], default: [] },
  aiDeadline:       { type: String, default: '' },
  aiDeadlineReason: { type: String, default: '' },
  startDate:        { type: String, default: '' },
}, { timestamps: true });

goalSchema.pre('save', async function() {
  if (this.isModified('status') && this.status === 'done' && !this.completedAt) {
    this.completedAt = new Date();
    this.progress = 100;
  }
});

module.exports = mongoose.model('Goal', goalSchema);