const mongoose = require('mongoose');

const agentChatSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  messages: { type: [mongoose.Schema.Types.Mixed], default: [] }, // full message objects as-is, same pattern as Resume.formData
}, { timestamps: true });

module.exports = mongoose.model('AgentChat', agentChatSchema);