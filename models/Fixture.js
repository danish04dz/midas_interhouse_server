const mongoose = require('mongoose');

// Sport-specific live score schemas
const cricketScoreSchema = new mongoose.Schema({
  teamA: {
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
  },
  teamB: {
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
  },
  currentBatting: { type: String, enum: ['teamA', 'teamB', ''], default: '' },
  totalOvers: { type: Number, default: 5 },
  inning: { type: Number, default: 1 }, // 1 or 2
  target: { type: Number, default: 0 },
}, { _id: false });

const kabaddiScoreSchema = new mongoose.Schema({
  teamA: {
    points: { type: Number, default: 0 },
    tackles: { type: Number, default: 0 },
    raids: { type: Number, default: 0 },
  },
  teamB: {
    points: { type: Number, default: 0 },
    tackles: { type: Number, default: 0 },
    raids: { type: Number, default: 0 },
  },
  half: { type: Number, default: 1 }, // 1 or 2
  timeRemaining: { type: String, default: '20:00' },
}, { _id: false });

const footballScoreSchema = new mongoose.Schema({
  teamA: {
    goals: { type: Number, default: 0 },
    yellowCards: { type: Number, default: 0 },
    redCards: { type: Number, default: 0 },
  },
  teamB: {
    goals: { type: Number, default: 0 },
    yellowCards: { type: Number, default: 0 },
    redCards: { type: Number, default: 0 },
  },
  half: { type: Number, default: 1 },
  minute: { type: Number, default: 0 },
}, { _id: false });

const genericScoreSchema = new mongoose.Schema({
  teamA: { points: { type: Number, default: 0 } },
  teamB: { points: { type: Number, default: 0 } },
  details: { type: String, default: '' },
}, { _id: false });

const culturalScoreSchema = new mongoose.Schema({
  teamA: { points: { type: Number, default: 0 }, round: { type: Number, default: 1 } },
  teamB: { points: { type: Number, default: 0 }, round: { type: Number, default: 1 } },
  currentRound: { type: Number, default: 1 },
  totalRounds: { type: Number, default: 3 },
  judgeNotes: { type: String, default: '' },
}, { _id: false });

// Commentary / Event log entry
const commentarySchema = new mongoose.Schema({
  time: { type: String, default: '' },   // e.g. "Over 3.2" or "24th min"
  text: { type: String, required: true }, // "Wicket! Ravi caught at mid-on"
  type: { type: String, enum: ['wicket', 'boundary', 'six', 'goal', 'point', 'tackle', 'timeout', 'general', 'milestone'], default: 'general' },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });

const SPORT_TYPES = [
  'cricket', 'kabaddi', 'football', 'badminton', 'table_tennis',
  'chess', 'carrom', 'volleyball', 'basketball', 'tug_of_war',
  'kho_kho', 'relay_race', 'shot_put', 'long_jump',
  'debate', 'music', 'dance', 'quiz', 'art', 'cultural', 'other',
];

const STATUSES = ['scheduled', 'live', 'half_time', 'completed', 'cancelled'];

const fixtureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    sport: { type: String, enum: SPORT_TYPES, default: 'other' },

    teamA: {
      house: { type: mongoose.Schema.Types.ObjectId, ref: 'House', required: true },
      label: { type: String, default: '' }, // e.g. "Phoenix" or custom
    },
    teamB: {
      house: { type: mongoose.Schema.Types.ObjectId, ref: 'House', required: true },
      label: { type: String, default: '' },
    },

    scheduledAt: { type: Date },
    venue: { type: String, default: '' },
    status: { type: String, enum: STATUSES, default: 'scheduled' },

    // Tournament Bracket & Advancement
    stage: {
      type: String,
      enum: ['league', 'round_1', 'quarter_final', 'semi_final', 'final', 'third_place'],
      default: 'league',
    },
    matchNumber: { type: Number, default: 1 },
    nextFixture: { type: mongoose.Schema.Types.ObjectId, ref: 'Fixture', default: null },
    nextFixtureSlot: { type: String, enum: ['teamA', 'teamB', ''], default: '' },

    // Live stream
    youtubeUrl: { type: String, default: '' }, // YouTube live or video URL

    // Live scores — one of these will be populated based on sport
    cricketScore: { type: cricketScoreSchema, default: null },
    kabaddiScore: { type: kabaddiScoreSchema, default: null },
    footballScore: { type: footballScoreSchema, default: null },
    culturalScore: { type: culturalScoreSchema, default: null },
    genericScore: { type: genericScoreSchema, default: null },

    commentary: [commentarySchema],

    // Result
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'House', default: null },
    resultSummary: { type: String, default: '' }, // e.g. "Phoenix won by 34 runs"
    isDraw: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    managedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Fixture', fixtureSchema);
