const mongoose = require('mongoose');

const exploreCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true }, // lowercased job title
  jobTitle: { type: String, required: true },
  category: { type: String, default: 'Other' }, // AI-classified, used for demand ranking too
  skills: [
    {
      name: String,
      minLevel: Number // 1-5
    }
  ],
  fetchedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ExploreCache', exploreCacheSchema);