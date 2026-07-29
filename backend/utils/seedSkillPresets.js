/**
 * Seeds skill presets into MongoDB, one document per category. Safe to
 * re-run — upserts by category, so adding a new preset later just means
 * editing this array and running it again.
 *
 * Usage: node utils/seedSkillPresets.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const SkillPreset = require('../models/SkillPreset');

const PRESET_SKILLS = {
  Frontend: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'Next.js', 'Tailwind CSS', 'Bootstrap', 'SASS/SCSS', 'Redux', 'Webpack', 'Vite'],
  Backend: ['Node.js', 'Express.js', 'Python', 'Django', 'Flask', 'Java', 'Spring Boot', 'PHP', 'Laravel', 'Go', 'Ruby on Rails', 'C#', '.NET', 'REST APIs', 'GraphQL'],
  Database: ['MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'Firebase', 'SQLite', 'Oracle', 'Cassandra', 'Elasticsearch', 'Prisma', 'Mongoose', 'SQL'],
  DevOps: ['Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Jenkins', 'GitHub Actions', 'Linux', 'Nginx', 'Terraform', 'Ansible'],
  Mobile: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Android SDK', 'iOS Development', 'Expo', 'Ionic'],
  Design: ['Figma', 'Adobe XD', 'Sketch', 'Photoshop', 'Illustrator', 'UI Design', 'UX Research', 'Wireframing', 'Prototyping', 'User Testing'],
  'Data Science': ['Python', 'R', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'SQL', 'Data Visualization', 'Statistics', 'Tableau', 'Power BI'],
  'Soft Skills': ['Communication', 'Leadership', 'Problem Solving', 'Teamwork', 'Time Management', 'Critical Thinking', 'Agile', 'Scrum', 'Project Management', 'Public Speaking'],
  Other: ['Git', 'GitHub', 'Jira', 'Postman', 'VS Code', 'Linux', 'Blockchain', 'Cybersecurity', 'Testing', 'Jest', 'Selenium'],
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  for (const [category, presets] of Object.entries(PRESET_SKILLS)) {
    await SkillPreset.findOneAndUpdate(
      { category },
      { category, presets },
      { upsert: true }
    );
    console.log(`✓ ${category} (${presets.length} presets)`);
  }

  console.log('Done seeding skill presets.');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});