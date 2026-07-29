const mongoose = require('mongoose');

// NOTE: the field is named `resourceType`, not `type`. Mongoose treats a key
// literally named `type` inside a nested object as a SchemaType declaration
// for the WHOLE field (e.g. it read our old `type: String` as "this entire
// array is of type String" instead of "this subdocument has a field called
// type"). That silently turned `resources` into `[String]` and broke every
// insert. Renaming avoids the ambiguity entirely.
const resourcesCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true }, // lowercased category/topic
  category: { type: String, required: true },
  resources: [
    {
      title: String,
      url: String,
      platform: String,
      resourceType: String, // "free" | "paid" — was `type`, renamed to avoid the Mongoose gotcha above
      desc: String
    }
  ],
  fetchedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ResourcesCache', resourcesCacheSchema);