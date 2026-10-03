const mongoose = require('mongoose');

const individualRegistrationSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
    house: { type: mongoose.Schema.Types.ObjectId, ref: 'House', required: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    status: {
      type: String,
      enum: ['registered', 'approved', 'disqualified'],
      default: 'registered',
    },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Prevent duplicate registration for same event
individualRegistrationSchema.index({ event: 1, participant: 1 }, { unique: true });

module.exports = mongoose.model('IndividualRegistration', individualRegistrationSchema);
