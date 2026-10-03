const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    year: { type: String, required: true, unique: true }, // "2024-25"
    name: { type: String, required: true }, // "Annual Competition 2025"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
