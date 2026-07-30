require('dotenv').config();
const dns = require('dns');
// Render's network doesn't support outbound IPv6. Node 18+ resolves
// dual-stack hosts (like smtp.gmail.com) IPv6-first by default, which then
// hangs/fails on Render before falling back to IPv4. This forces IPv4-first
// resolution process-wide, so nodemailer (and anything else making outbound
// connections) gets a reachable address on the first try.
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const aiRoutes = require('./routes/aiRoutes');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const skillRoutes = require('./routes/skillRoutes');
const goalRoutes = require('./routes/goalRoutes');
const careerRoutes = require('./routes/careerRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const marketRoutes = require('./routes/marketRoutes');
const learningRoutes = require('./routes/learningRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const agentRoutes = require('./routes/agentRoutes');

connectDB();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/api/ai', aiRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/resume', resumeRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'SkillPulse API is running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/careers', careerRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/agent', agentRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

