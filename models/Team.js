const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    house: { type: mongoose.Schema.Types.ObjectId, ref: 'House', required: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Participant' }],
    captainName: { type: String, default: '' },
    status: {
      type: String,
      enum: ['registered', 'approved', 'disqualified'],
      default: 'registered',
    },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

teamSchema.index({ event: 1, house: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
