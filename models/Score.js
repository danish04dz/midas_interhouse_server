const mongoose = require('mongoose');

const criteriaScoreSchema = new mongoose.Schema({
  criteriaName: { type: String, required: true },
  maxMarks: { type: Number, required: true },
  marksAwarded: { type: Number, required: true, default: 0 },
});

const scoreSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    house: { type: mongoose.Schema.Types.ObjectId, ref: 'House', required: true },
    entryType: { type: String, enum: ['team', 'individual'], required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' },
    criteriaScores: [criteriaScoreSchema],
    totalScore: { type: Number, default: 0 },
    rank: { type: Number },                       // 1, 2, 3 ...
    pointsAwarded: { type: Number, default: 0 },  // house points from marking scheme
    remarks: { type: String, default: '' },
    isLocked: { type: Boolean, default: false },   // locked after admin approval
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Score', scoreSchema);
