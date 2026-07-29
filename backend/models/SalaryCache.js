const mongoose = require('mongoose');

const salaryCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true }, // e.g. "full stack developer_in"
  jobTitle: { type: String, required: true },
  category: { type: String, index: true }, // e.g. "Engineering" — used to rank demand against peers
  salaryMin: Number,
  salaryMax: Number,
  listingCount: Number,
  totalMatchingCount: Number,
  demandLevel: String, // "very high" | "high" | "medium" | "low"
  demandPeerMedian: Number, // median listing count among category peers used for ranking
  demandPeerCount: Number,  // how many peers were compared against
  fetchedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SalaryCache', salaryCacheSchema);