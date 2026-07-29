const mongoose = require('mongoose');

const jobsCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true }, // e.g. "machine learning engineer_in_page1"
  jobTitle: { type: String, required: true },
  page: { type: Number, default: 1 },
  jobs: [
    {
      title: String,
      company: String,
      location: String,
      salary_min: Number,
      salary_max: Number,
      url: String,
      posted: Date,
      description: String
    }
  ],
  totalCount: Number, // Adzuna's total matching count across all pages
  fetchedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('JobsCache', jobsCacheSchema);