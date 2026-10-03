const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    recipientName: { type: String, required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    house: { type: mongoose.Schema.Types.ObjectId, ref: 'House', required: true },
    position: { type: Number, required: true }, // 1, 2, 3
    positionLabel: { type: String, default: '' }, // "Gold", "Silver", "Bronze"
    type: { type: String, enum: ['team', 'individual'], required: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' },
    pdfUrl: { type: String, default: '' },
    pdfPublicId: { type: String, default: '' },
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Certificate', certificateSchema);
