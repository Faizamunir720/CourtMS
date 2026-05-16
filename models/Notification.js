const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: [
        'hearing_scheduled',
        'hearing_postponed',
        'hearing_completed',
        'case_assigned',
        'case_closed',
        'document_uploaded',
        'outcome_recorded',
        'complaint_submitted',
        'general',
      ],
      default: 'general',
    },
    relatedCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      default: null,
    },
    relatedHearingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hearing',
      default: null,
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
