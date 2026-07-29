/**
 * Run once (and re-run periodically, e.g. weekly, if you want fresher
 * peer data) to pre-populate SalaryCache with real Adzuna counts for
 * every curated career. Without this, relative demand ranking has no
 * peer data to compare against until real users happen to browse
 * enough careers in each category — this warms the cache immediately.
 *
 * Usage: node utils/seedDemandData.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Career = require('../models/Career');
const { calculateLiveSalary } = require('../services/salaryService');

const DELAY_MS = 1500; // spread requests out to respect Adzuna's rate limit

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const careers = await Career.find({});
  console.log(`Found ${careers.length} curated careers to seed`);

  for (const career of careers) {
    try {
      const result = await calculateLiveSalary(career.title, career.category);
      if (result) {
        console.log(
          `✓ ${career.title} (${career.category}) — ` +
          `${result.totalMatchingCount} listings, demand: ${result.demandLevel}`
        );
      } else {
        console.log(`✗ ${career.title} — no data returned`);
      }
    } catch (err) {
      console.error(`✗ ${career.title} — error: ${err.message}`);
    }
    await sleep(DELAY_MS);
  }

  console.log('Done seeding demand data.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});