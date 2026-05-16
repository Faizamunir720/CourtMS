const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userEmail: { type: String, trim: true },
    userRole: { type: String, trim: true },
    action: {
      type: String,
      required: true,
      enum: [
        'user_login',
        'user_register',
        'case_created',
        'case_updated',
        'case_closed',
        'judge_assigned',
        'hearing_scheduled',
        'hearing_outcome_recorded',
        'document_uploaded',
        'document_deleted',
        'complaint_submitted',
        'notification_sent',
      ],
    },
    description: { type: String, trim: true },
    resourceType: { type: String, trim: true },
    resourceId: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
