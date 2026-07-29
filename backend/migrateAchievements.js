require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Old title → new key mapping
const KEY_MAP = {
  'First Step!':     'first_skill',
  'First Step':      'first_skill',
  'Five Skills':     'five_skills',
  'Skill Collector': 'five_skills',
  'Ten Skills':      'ten_skills',
  'Skill Hoarder':   'ten_skills',
  'Skill Master':    'twenty_skills',
  'Expert Level':    'expert_skill',
  'Polymath':        'five_expert',
  'Full Stack Mind': 'all_categories',
  'Goal Setter':     'first_goal',
  'Goal Crusher':    'first_goal_done',
  'Ambitious':       'five_goals',
  'Unstoppable':     'five_goals_done',
  'Legend':          'ten_goals_done',
  'No Shortcuts':    'high_priority',
  'Half Way There':  'career_match_50',
  'Career Ready':    'career_match_80',
  'Dream Achieved':  'career_match_100',
  'Identity Formed': 'profile_complete',
  'Rising Star':     'level_5',
  'Veteran':         'level_10',
  'Early Adopter':   'early_adopter',
  'Completionist':   'completionist',
};

const migrate = async () => {
  await connectDB();

  const Achievement = require('./models/Achievement');
  const docs = await Achievement.find({ key: { $exists: false } });

  console.log('Found ' + docs.length + ' achievements without key field');

  let fixed = 0, skipped = 0;

  for (const doc of docs) {
    const key = KEY_MAP[doc.title];
    if (!key) {
      console.log('No mapping for:', doc.title, '— skipping');
      skipped++;
      continue;
    }
    try {
      await Achievement.updateOne({ _id: doc._id }, { $set: { key } });
      console.log('Fixed:', doc.title, '->', key);
      fixed++;
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate — delete the old one
        await Achievement.deleteOne({ _id: doc._id });
        console.log('Removed duplicate:', doc.title);
      } else {
        console.error('Error on', doc.title, err.message);
      }
    }
  }

  console.log('\nDone! Fixed:', fixed, '| Skipped:', skipped);
  mongoose.disconnect();
};

migrate().catch(console.error);