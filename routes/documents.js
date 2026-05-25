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

async function userCanAccessCase(user, caseId) {
  const c = await Case.findById(caseId).select('lawyerId citizenId assignedJudgeId');
  if (!c) return false;
  if (user.role === 'admin' || user.role === 'clerk') return true;
  if (user.role === 'lawyer' && c.lawyerId && c.lawyerId.toString() === user.id) return true;
  if (user.role === 'citizen' && c.citizenId && c.citizenId.toString() === user.id) return true;
  if (user.role === 'judge' && c.assignedJudgeId && c.assignedJudgeId.toString() === user.id) return true;
  return false;
}

const LAWYER_CATEGORIES = ['petition', 'evidence', 'other'];
const CLERK_CATEGORIES = ['notice', 'judgment', 'report', 'other'];
const CITIZEN_CATEGORIES = ['evidence', 'other'];

async function caseIdsForUser(user) {
  if (user.role === 'lawyer') {
    const rows = await Case.find({ lawyerId: user.id }).select('_id');
    return rows.map((c) => c._id);
  }
  if (user.role === 'citizen') {
    const rows = await Case.find({ citizenId: user.id }).select('_id');
    return rows.map((c) => c._id);
  }
  if (user.role === 'judge') {
    const rows = await Case.find({ assignedJudgeId: user.id }).select('_id');
    return rows.map((c) => c._id);
  }
  return null;
}
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
router.post('/', authenticate, authorize('lawyer', 'clerk', 'citizen'), upload.single('file'), async (req, res) => {
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

    if (req.user.role === 'citizen') {
      if (!c.citizenId || c.citizenId.toString() !== req.user.id) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'You can only upload documents for your own cases' });
      }
    }
    if (req.user.role === 'lawyer') {
      if (!c.lawyerId || c.lawyerId.toString() !== req.user.id) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'You can only upload documents for cases you represent' });
      }
    }

    const category = documentCategory || 'other';
    const allowedCats =
      req.user.role === 'clerk' ? CLERK_CATEGORIES
        : req.user.role === 'lawyer' ? LAWYER_CATEGORIES
          : CITIZEN_CATEGORIES;
    if (!allowedCats.includes(category)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: `Invalid category for ${req.user.role}. Allowed: ${allowedCats.join(', ')}`,
      });
    }

    const canAccess = await userCanAccessCase(req.user, caseId);
    if (!canAccess) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'You do not have access to this case' });
    }

    const doc = await Document.create({
      caseId,
      uploadedBy: req.user.id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      documentCategory: category,
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

    const notifyTargets = new Set();
    if (c.citizenId) notifyTargets.add(c.citizenId.toString());
    if (c.lawyerId && c.lawyerId.toString() !== req.user.id) notifyTargets.add(c.lawyerId.toString());
    if (c.assignedJudgeId) notifyTargets.add(c.assignedJudgeId.toString());
    for (const uid of notifyTargets) {
      await Notification.create({
        userId: uid,
        title: 'New Document on Case File',
        message: `${req.user.name} (${req.user.role}) uploaded "${req.file.originalname}" for case ${c.caseNumber}`,
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
    const allowedCaseIds = await caseIdsForUser(req.user);
    if (allowedCaseIds) {
      if (allowedCaseIds.length === 0) {
        return res.json({ documents: [], pagination: { page, limit, total: 0 } });
      }
      if (caseId && mongoose.Types.ObjectId.isValid(caseId)) {
        const ok = allowedCaseIds.some((id) => id.toString() === caseId);
        if (!ok) {
          return res.status(403).json({ error: 'You do not have access to documents for this case' });
        }
        filter.caseId = caseId;
      } else {
        filter.caseId = { $in: allowedCaseIds };
      }
    } else if (caseId && mongoose.Types.ObjectId.isValid(caseId)) {
      filter.caseId = caseId;
    }
    if (documentCategory) filter.documentCategory = documentCategory;

    const total = await Document.countDocuments(filter);
    const docs = await Document.find(filter)
      .populate('uploadedBy', 'name role email')
      .populate({
        path: 'caseId',
        select: 'caseNumber title status applicant respondent',
        populate: { path: 'lawyerId', select: 'name email' },
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      documents: docs.map((d) => ({
        id: d._id,
        case: d.caseId ? {
          id: d.caseId._id,
          caseNumber: d.caseId.caseNumber,
          title: d.caseId.title,
          status: d.caseId.status,
          applicant: d.caseId.applicant,
          respondent: d.caseId.respondent,
          lawyer: d.caseId.lawyerId ? { name: d.caseId.lawyerId.name, email: d.caseId.lawyerId.email } : null,
        } : null,
        fileName: d.fileName,
        originalName: d.originalName,
        fileType: d.fileType,
        fileSize: d.fileSize,
        documentCategory: d.documentCategory,
        description: d.description,
        uploadedBy: d.uploadedBy ? { id: d.uploadedBy._id, name: d.uploadedBy.name, role: d.uploadedBy.role } : null,
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

    const allowed = await userCanAccessCase(req.user, doc.caseId);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have access to this document' });
    }

    res.setHeader('Content-Type', doc.fileType || 'application/octet-stream');
    res.download(doc.filePath, doc.originalName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documents/:docId
router.delete('/:docId', authenticate, authorize('clerk'), async (req, res) => {
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
