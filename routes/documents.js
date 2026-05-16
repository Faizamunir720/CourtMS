const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const Case = require('../models/Case');
const { authenticate, authorize } = require('../middlewares/auth');
const { createAuditLog } = require('../middlewares/auditLogger');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Allowed: pdf, doc, docx, jpg, jpeg, png, txt'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/documents
router.post('/', authenticate, authorize('admin', 'lawyer', 'clerk', 'judge'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const { caseId, documentCategory, description } = req.body;

    if (!caseId || !mongoose.Types.ObjectId.isValid(caseId)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Valid caseId is required' });
    }

    const c = await Case.findById(caseId);
    if (!c) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Case not found' });
    }

    const doc = await Document.create({
      caseId,
      uploadedBy: req.user.id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      documentCategory: documentCategory || 'other',
      description: description || '',
    });

    createAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'document_uploaded',
      description: `Document uploaded: ${req.file.originalname} for case ${c.caseNumber}`,
      resourceType: 'document',
      resourceId: doc._id.toString(),
      ipAddress: req.ip,
    });

    if (c.lawyerId && c.lawyerId.toString() !== req.user.id) {
      await Notification.create({
        userId: c.lawyerId,
        title: 'New Document Uploaded',
        message: `A new document has been uploaded for case ${c.caseNumber}`,
        type: 'document_uploaded',
        relatedCaseId: caseId,
      });
    }

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: doc._id,
        caseId: doc.caseId,
        fileName: doc.fileName,
        originalName: doc.originalName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        documentCategory: doc.documentCategory,
        description: doc.description,
        uploadedBy: req.user.name,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents
router.get('/', authenticate, async (req, res) => {
  try {
    const { caseId, documentCategory, page: pg, limit: lm } = req.query;
    const page = parseInt(pg) || 1;
    const limit = parseInt(lm) || 10;

    const filter = {};
    if (caseId && mongoose.Types.ObjectId.isValid(caseId)) filter.caseId = caseId;
    if (documentCategory) filter.documentCategory = documentCategory;
    if (req.user.role === 'citizen') {
      const cases = await Case.find({ citizenId: req.user.id }).select('_id');
      filter.caseId = { $in: cases.map((c) => c._id) };
    }

    const total = await Document.countDocuments(filter);
    const docs = await Document.find(filter)
      .populate('uploadedBy', 'name role')
      .populate('caseId', 'caseNumber title')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      documents: docs.map((d) => ({
        id: d._id,
        case: d.caseId ? { id: d.caseId._id, caseNumber: d.caseId.caseNumber, title: d.caseId.title } : null,
        fileName: d.fileName,
        originalName: d.originalName,
        fileType: d.fileType,
        fileSize: d.fileSize,
        documentCategory: d.documentCategory,
        description: d.description,
        uploadedBy: d.uploadedBy ? { id: d.uploadedBy._id, name: d.uploadedBy.name } : null,
        createdAt: d.createdAt,
      })),
      pagination: { page, limit, total },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:docId/download
router.get('/:docId/download', authenticate, async (req, res) => {
  try {
    const { docId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const doc = await Document.findById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(doc.filePath, doc.originalName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documents/:docId
router.delete('/:docId', authenticate, authorize('admin', 'clerk'), async (req, res) => {
  try {
    const { docId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const doc = await Document.findByIdAndDelete(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }

    createAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'document_deleted',
      description: `Document deleted: ${doc.originalName}`,
      resourceType: 'document',
      resourceId: docId,
      ipAddress: req.ip,
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
