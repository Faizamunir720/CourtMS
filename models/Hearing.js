const mongoose = require('mongoose');

const hearingSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
    },
    hearingDate: { type: Date, required: true },
    hearingTime: {
      type: String,
      required: true,
      match: [/^\d{2}:\d{2}$/, 'Hearing time must be in HH:MM format'],
    },
    location: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    judgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      default: 'Scheduled',
      enum: ['Scheduled', 'Completed', 'Adjourned', 'Postponed'],
    },
    outcome: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Hearing', hearingSchema);
