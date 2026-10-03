const mongoose = require('mongoose');

const houseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    number: { type: Number, required: true, unique: true },
    color: { type: String, required: true, default: '#6B7280' }, // hex color
    logoUrl: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },
    motto: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('House', houseSchema);
