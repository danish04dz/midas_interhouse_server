const mongoose = require('mongoose');

const DEPARTMENTS = ['robotics_coding', 'games', 'art_craft', 'music', 'pd'];
const STATUSES = ['draft', 'registration_open', 'registration_closed', 'live', 'completed'];

const criterionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  maxMarks: { type: Number, required: true },
  description: { type: String, default: '' },
});

const positionPointSchema = new mongoose.Schema({
  rank: { type: Number, required: true },   // 1, 2, 3 …
  points: { type: Number, required: true },  // house points awarded
  label: { type: String, default: '' },      // "Gold", "Silver", "Bronze"
});

const timelineEntrySchema = new mongoose.Schema({
  label: { type: String, required: true },        // "Registration Deadline"
  date: { type: Date, required: true },
  description: { type: String, default: '' },
});

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    department: { type: String, enum: DEPARTMENTS, required: true },
    type: { type: String, enum: ['team', 'individual'], required: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    brief: { type: String, default: '' },          // Rich text HTML
    rules: [{ type: String }],                      // Array of rule strings
    timeline: [timelineEntrySchema],
    markingScheme: {
      criteria: [criterionSchema],
      positions: [positionPointSchema],
      totalMarks: { type: Number, default: 0 },
    },
    venue: { type: String, default: '' },
    maxTeams: { type: Number },                    // for team events
    maxPerTeam: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 10 },
    },
    maxIndividuals: { type: Number },              // for individual events
    status: { type: String, enum: STATUSES, default: 'draft' },
    registrationWindow: {
      startDate: { type: Date },
      endDate: { type: Date },
    },
    coverImageUrl: { type: String, default: '' },
    coverImagePublicId: { type: String, default: '' },
    isAnnual: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
