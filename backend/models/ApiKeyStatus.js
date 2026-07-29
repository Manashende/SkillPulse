// backend/models/ApiKeyStatus.js
//
// One document per Gemini API key in the pool, so key health survives a
// server restart and can be surfaced somewhere other than server logs.

const mongoose = require('mongoose');

const apiKeyStatusSchema = new mongoose.Schema({
  keyIndex: { type: Number, required: true, unique: true },
  keyMasked: { type: String }, // last 4 chars only — never store the full key
  status: { type: String, enum: ['ok', 'dead'], default: 'dead' },
  lastFailureAt: { type: Date },
  lastFailureReason: { type: String },
  lastAlertAt: { type: Date },
  failureCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ApiKeyStatus', apiKeyStatusSchema);