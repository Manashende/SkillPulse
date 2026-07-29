require('dotenv').config();
const mongoose = require('mongoose');
const Career = require('../models/Career');
const connectDB = require('../config/db');

const careers = [
  {
    title: 'Frontend Developer',
    category: 'Engineering',
    description: 'Build responsive, interactive UIs using modern web technologies like React, TypeScript and CSS frameworks.',
    requiredSkills: [
      { name: 'HTML', minLevel: 4, weight: 2 },
      { name: 'CSS', minLevel: 4, weight: 2 },
      { name: 'JavaScript', minLevel: 4, weight: 3 },
      { name: 'React', minLevel: 3, weight: 3 },
      { name: 'Git', minLevel: 3, weight: 1 },
    ],
    avgSalary: { min: 400000, max: 1600000, currency: 'INR' },
    demandLevel: 'very high',
  },
  {
    title: 'Backend Developer',
    category: 'Engineering',
    description: 'Design and build server-side logic, REST APIs, and database integrations that power applications.',
    requiredSkills: [
      { name: 'Node.js', minLevel: 3, weight: 3 },
      { name: 'Express', minLevel: 3, weight: 2 },
      { name: 'MongoDB', minLevel: 3, weight: 2 },
      { name: 'REST APIs', minLevel: 4, weight: 3 },
      { name: 'Git', minLevel: 3, weight: 1 },
    ],
    avgSalary: { min: 500000, max: 1800000, currency: 'INR' },
    demandLevel: 'very high',
  },
  {
    title: 'Full Stack Developer',
    category: 'Engineering',
    description: 'Work across the entire stack — from UI components to APIs, databases and deployment pipelines.',
    requiredSkills: [
      { name: 'React', minLevel: 3, weight: 3 },
      { name: 'Node.js', minLevel: 3, weight: 3 },
      { name: 'MongoDB', minLevel: 3, weight: 2 },
      { name: 'JavaScript', minLevel: 4, weight: 3 },
      { name: 'REST APIs', minLevel: 3, weight: 2 },
      { name: 'Git', minLevel: 3, weight: 1 },
    ],
    avgSalary: { min: 600000, max: 2200000, currency: 'INR' },
    demandLevel: 'very high',
  },
  {
    title: 'UX Designer',
    category: 'Design',
    description: 'Research user needs and design intuitive, accessible product experiences through wireframes and prototypes.',
    requiredSkills: [
      { name: 'Figma', minLevel: 4, weight: 3 },
      { name: 'User Research', minLevel: 3, weight: 3 },
      { name: 'Wireframing', minLevel: 4, weight: 2 },
      { name: 'Prototyping', minLevel: 3, weight: 2 },
      { name: 'Communication', minLevel: 4, weight: 2 },
    ],
    avgSalary: { min: 450000, max: 1400000, currency: 'INR' },
    demandLevel: 'high',
  },
  {
    title: 'UI Developer',
    category: 'Design',
    description: 'Implement pixel-perfect designs and build reusable, accessible component libraries.',
    requiredSkills: [
      { name: 'HTML', minLevel: 4, weight: 2 },
      { name: 'CSS', minLevel: 5, weight: 3 },
      { name: 'JavaScript', minLevel: 3, weight: 2 },
      { name: 'Figma', minLevel: 3, weight: 2 },
      { name: 'React', minLevel: 3, weight: 2 },
    ],
    avgSalary: { min: 350000, max: 1200000, currency: 'INR' },
    demandLevel: 'high',
  },
  {
    title: 'Data Scientist',
    category: 'Data',
    description: 'Analyze complex datasets and build predictive models to drive business decisions using ML techniques.',
    requiredSkills: [
      { name: 'Python', minLevel: 4, weight: 3 },
      { name: 'Machine Learning', minLevel: 3, weight: 3 },
      { name: 'Statistics', minLevel: 4, weight: 3 },
      { name: 'SQL', minLevel: 3, weight: 2 },
      { name: 'Data Visualization', minLevel: 3, weight: 2 },
    ],
    avgSalary: { min: 700000, max: 2500000, currency: 'INR' },
    demandLevel: 'very high',
  },
  {
    title: 'Data Analyst',
    category: 'Data',
    description: 'Transform raw data into actionable insights through SQL queries, dashboards and statistical analysis.',
    requiredSkills: [
      { name: 'SQL', minLevel: 4, weight: 3 },
      { name: 'Excel', minLevel: 4, weight: 2 },
      { name: 'Python', minLevel: 2, weight: 2 },
      { name: 'Data Visualization', minLevel: 3, weight: 3 },
      { name: 'Statistics', minLevel: 3, weight: 2 },
    ],
    avgSalary: { min: 400000, max: 1200000, currency: 'INR' },
    demandLevel: 'high',
  },
  {
    title: 'DevOps Engineer',
    category: 'DevOps',
    description: 'Bridge development and operations by automating deployments, managing cloud infrastructure and ensuring uptime.',
    requiredSkills: [
      { name: 'Docker', minLevel: 4, weight: 3 },
      { name: 'Kubernetes', minLevel: 3, weight: 3 },
      { name: 'CI/CD', minLevel: 4, weight: 3 },
      { name: 'Linux', minLevel: 4, weight: 2 },
      { name: 'AWS', minLevel: 3, weight: 2 },
    ],
    avgSalary: { min: 800000, max: 2400000, currency: 'INR' },
    demandLevel: 'very high',
  },
  {
    title: 'Cloud Architect',
    category: 'DevOps',
    description: 'Design scalable, secure and cost-efficient cloud infrastructure for enterprise-grade applications.',
    requiredSkills: [
      { name: 'AWS', minLevel: 5, weight: 3 },
      { name: 'Docker', minLevel: 4, weight: 2 },
      { name: 'Kubernetes', minLevel: 4, weight: 3 },
      { name: 'Networking', minLevel: 4, weight: 2 },
      { name: 'Security', minLevel: 3, weight: 2 },
    ],
    avgSalary: { min: 1500000, max: 4000000, currency: 'INR' },
    demandLevel: 'very high',
  },
  {
    title: 'Mobile Developer',
    category: 'Mobile',
    description: 'Build cross-platform mobile applications for iOS and Android using React Native or Flutter.',
    requiredSkills: [
      { name: 'React Native', minLevel: 4, weight: 3 },
      { name: 'JavaScript', minLevel: 4, weight: 3 },
      { name: 'React', minLevel: 3, weight: 2 },
      { name: 'REST APIs', minLevel: 3, weight: 2 },
      { name: 'Git', minLevel: 3, weight: 1 },
    ],
    avgSalary: { min: 500000, max: 1800000, currency: 'INR' },
    demandLevel: 'high',
  },
  {
    title: 'Product Manager',
    category: 'Management',
    description: 'Define product vision, prioritize features and align cross-functional engineering and design teams.',
    requiredSkills: [
      { name: 'Product Strategy', minLevel: 4, weight: 3 },
      { name: 'Communication', minLevel: 5, weight: 3 },
      { name: 'Agile', minLevel: 4, weight: 2 },
      { name: 'Data Analysis', minLevel: 3, weight: 2 },
      { name: 'User Research', minLevel: 3, weight: 2 },
    ],
    avgSalary: { min: 1200000, max: 3500000, currency: 'INR' },
    demandLevel: 'very high',
  },
  {
    title: 'Cybersecurity Analyst',
    category: 'Engineering',
    description: 'Protect systems and networks from threats through monitoring, penetration testing and security assessments.',
    requiredSkills: [
      { name: 'Security', minLevel: 4, weight: 3 },
      { name: 'Networking', minLevel: 4, weight: 3 },
      { name: 'Linux', minLevel: 4, weight: 2 },
      { name: 'Python', minLevel: 3, weight: 2 },
      { name: 'Ethical Hacking', minLevel: 3, weight: 2 },
    ],
    avgSalary: { min: 600000, max: 2000000, currency: 'INR' },
    demandLevel: 'very high',
  },
  {
    title: 'Machine Learning Engineer',
    category: 'Data',
    description: 'Build, train and deploy machine learning models and AI-powered systems at production scale.',
    requiredSkills: [
      { name: 'Python', minLevel: 5, weight: 3 },
      { name: 'Machine Learning', minLevel: 4, weight: 3 },
      { name: 'TensorFlow', minLevel: 3, weight: 3 },
      { name: 'Statistics', minLevel: 4, weight: 2 },
      { name: 'Docker', minLevel: 3, weight: 1 },
    ],
    avgSalary: { min: 1000000, max: 3500000, currency: 'INR' },
    demandLevel: 'very high',
  },
  {
    title: 'QA Engineer',
    category: 'Engineering',
    description: 'Ensure software quality through manual and automated testing strategies across the full development lifecycle.',
    requiredSkills: [
      { name: 'Testing', minLevel: 4, weight: 3 },
      { name: 'Selenium', minLevel: 3, weight: 3 },
      { name: 'JavaScript', minLevel: 3, weight: 2 },
      { name: 'Agile', minLevel: 3, weight: 2 },
      { name: 'Git', minLevel: 3, weight: 1 },
    ],
    avgSalary: { min: 350000, max: 1200000, currency: 'INR' },
    demandLevel: 'high',
  },
  {
    title: 'Android Developer',
    category: 'Mobile',
    description: 'Build native Android applications using Kotlin and the Android SDK for millions of users.',
    requiredSkills: [
      { name: 'Kotlin', minLevel: 4, weight: 3 },
      { name: 'Android SDK', minLevel: 4, weight: 3 },
      { name: 'Java', minLevel: 3, weight: 2 },
      { name: 'REST APIs', minLevel: 3, weight: 2 },
      { name: 'Git', minLevel: 3, weight: 1 },
    ],
    avgSalary: { min: 500000, max: 1800000, currency: 'INR' },
    demandLevel: 'high',
  },
];

const seed = async () => {
  await connectDB();
  try {
    await Career.deleteMany({});
    await Career.insertMany(careers);
    console.log(`✅ Seeded ${careers.length} careers with Indian salary data!`);
  } catch (e) {
    console.error('❌ Seed failed:', e.message);
  } finally {
    mongoose.disconnect();
  }
};

seed();