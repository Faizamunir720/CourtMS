const mongoose = require('mongoose');

const CASE_STATUSES = [
  'Submitted',
  'Registered',
  'Hearing Scheduled',
  'Ongoing',
  'Adjourned',
  'Closed',
];

const caseSchema = new mongoose.Schema(
  {
    caseNumber: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    applicant: { type: String, required: true, trim: true },
    respondent: { type: String, required: true, trim: true },
    caseType: {
      type: String,
      required: true,
      enum: ['civil', 'criminal', 'commercial'],
    },
    status: {
      type: String,
      default: 'Submitted',
      enum: CASE_STATUSES,
    },
    filedDate: { type: Date, required: true },
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedJudgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    /** Who filed the case at submission: citizen (self) or lawyer (for client) */
    submittedByRole: {
      type: String,
      enum: ['citizen', 'lawyer'],
      default: null,
    },
  },
  { timestamps: true }
);

caseSchema.statics.STATUSES = CASE_STATUSES;

module.exports = mongoose.model('Case', caseSchema);
