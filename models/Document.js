const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: { type: String, required: true, trim: true },
    originalName: { type: String, required: true, trim: true },
    fileType: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true },
    filePath: { type: String, required: true, trim: true },
    documentCategory: {
      type: String,
      required: true,
      enum: ['evidence', 'petition', 'judgment', 'notice', 'report', 'other'],
      default: 'other',
    },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
