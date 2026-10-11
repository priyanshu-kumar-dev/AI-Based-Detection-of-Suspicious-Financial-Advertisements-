const Ad = require('../models/Ad');
const sample = require('../config/sampleAds.json');
const { extractEntities } = require('./extractor');
const { recomputeAll } = require('./pipeline');

// Loads the demo dataset the first time the server starts on an empty database.
async function seedIfEmpty() {
  if ((await Ad.countDocuments()) > 0) return;
  const docs = sample.map((a) => ({
    ...a,
    postedAt: new Date(a.postedAt),
    extracted: extractEntities(a.text),
  }));
  await Ad.insertMany(docs);
  await recomputeAll();
  console.log(`Seeded ${docs.length} sample ads`);
}

module.exports = { seedIfEmpty };