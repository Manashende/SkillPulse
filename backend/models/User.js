const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  bio:      { type: String, default: '' },
  location: { type: String, default: '' },
  github:   { type: String, default: '' },
  linkedin: { type: String, default: '' },
  xp:       { type: Number, default: 0 },
  level:    { type: Number, default: 1 },
  isVerified:   { type: Boolean, default: false },
  otpCode:      { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  otpLastSentAt: { type: Date, default: null },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  const thresholds = [0, 200, 500, 1000, 1800, 3000, 4500, 6500, 9000, 12000];
  let lv = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if ((this.xp || 0) >= thresholds[i]) lv = i + 1;
  }
  this.level = Math.min(lv, 10);
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);