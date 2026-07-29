const mongoose = require('mongoose');

const careerSchema = new mongoose.Schema({
  title:       { type: String, required: true, unique: true },
  category:    { type: String, required: true },
  description: { type: String, required: true },
  requiredSkills: [{
    name:     { type: String, required: true },
    minLevel: { type: Number, default: 3 },
    weight:   { type: Number, default: 1 },
  }],
  avgSalary:   { min: Number, max: Number, currency: { type: String, default: 'USD' } },
  demandLevel: { type: String, enum: ['low','medium','high','very high'], default: 'high' },
  icon:        { type: String, default: 'code' },
}, { timestamps: true });

module.exports = mongoose.model('Career', careerSchema);