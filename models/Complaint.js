const mongoose = require('mongoose');

const CATEGORIES = ['scheduling', 'documents', 'portal', 'other'];
const CLERK_CATEGORIES = ['scheduling', 'documents'];
const ADMIN_CATEGORIES = ['portal', 'other'];

const complaintSchema = new mongoose.Schema(
  {
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      default: null,
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORIES,
      default: 'scheduling',
    },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'resolved', 'dismissed'],
      default: 'pending',
    },
    response: { type: String, trim: true },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

complaintSchema.statics.CATEGORIES = CATEGORIES;
complaintSchema.statics.CLERK_CATEGORIES = CLERK_CATEGORIES;
complaintSchema.statics.ADMIN_CATEGORIES = ADMIN_CATEGORIES;

module.exports = mongoose.model('Complaint', complaintSchema);
