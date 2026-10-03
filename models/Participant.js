const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, trim: true },
    class: { type: String, required: true },          // "10-A"
    house: { type: mongoose.Schema.Types.ObjectId, ref: 'House', required: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    photoUrl: { type: String, default: '' },
    photoPublicId: { type: String, default: '' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Compound unique: same roll number should not repeat in same session
participantSchema.index({ rollNumber: 1, session: 1 }, { unique: true });

module.exports = mongoose.model('Participant', participantSchema);
