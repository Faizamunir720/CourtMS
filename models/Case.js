const mongoose = require('mongoose');

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
      default: 'Pending',
      enum: ['Pending', 'Ongoing', 'Closed'],
    },
    filedDate: { type: Date, required: true },
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Case', caseSchema);
