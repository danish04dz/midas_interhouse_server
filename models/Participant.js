const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    class: { type: String, required: true },          // "10-A"
    house: { type: mongoose.Schema.Types.ObjectId, ref: 'House', required: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    photoUrl: { type: String, default: '' },
    photoPublicId: { type: String, default: '' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sportsStats: [
      {
        sportName: { type: String, trim: true },
        stats: [
          {
            label: { type: String, trim: true },
            value: { type: String, trim: true }
          }
        ]
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Participant', participantSchema);
