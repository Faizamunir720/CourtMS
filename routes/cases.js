const express = require('express');
const mongoose = require('mongoose');
const Case = require('../models/Case');
const User = require('../models/User');
const Hearing = require('../models/Hearing');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middlewares/auth');
const { createAuditLog } = require('../middlewares/auditLogger');

const router = express.Router();

async function notifyUser(userId, title, message, type, relatedCaseId = null) {
  try {
    await Notification.create({ userId, title, message, type, relatedCaseId });
  } catch (e) {
    console.error('Notification error:', e.message);
  }
}

// POST /api/cases
router.post('/', authenticate, authorize('lawyer', 'admin', 'judge', 'clerk'), async (req, res) => {
  try {
    const { caseNumber, title, description, applicant, respondent, caseType, filedDate, lawyerId, citizenId } = req.body;

    if (!caseNumber || !title || !description || !applicant || !respondent || !caseType || !filedDate || !lawyerId) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!['civil', 'criminal', 'commercial'].includes(caseType)) {
      return res.status(400).json({ error: 'caseType must be civil, criminal, or commercial' });
    }
    if (!mongoose.Types.ObjectId.isValid(lawyerId)) {
      return res.status(400).json({ error: 'Invalid lawyer ID' });
    }

    const existing = await Case.findOne({ caseNumber });
    if (existing) {
      return res.status(409).json({ error: 'Case number already exists' });
    }

    const lawyer = await User.findById(lawyerId);
    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(404).json({ error: 'Lawyer not found' });
    }

    const newCase = await Case.create({
      caseNumber,
      title,
      description,
      applicant,
      respondent,
      caseType,
      filedDate,
      lawyerId,
      citizenId: citizenId && mongoose.Types.ObjectId.isValid(citizenId) ? citizenId : null,
      status: 'Pending',
    });

    createAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'case_created',
      description: `Case created: ${caseNumber} - ${title}`,
      resourceType: 'case',
      resourceId: newCase._id.toString(),
      ipAddress: req.ip,
    });

    await notifyUser(lawyerId, 'New Case Assigned', `You have been assigned to case ${caseNumber}: ${title}`, 'case_assigned', newCase._id);

    res.status(201).json({
      message: 'Case created successfully',
      case: {
        id: newCase._id,
        caseNumber: newCase.caseNumber,
        title: newCase.title,
        status: newCase.status,
        lawyerId: newCase.lawyerId,
        createdAt: newCase.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cases
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, caseType, search, lawyerId, judgeId, page: pg, limit: lm } = req.query;
    const page = parseInt(pg) || 1;
    const limit = parseInt(lm) || 10;

    const filter = {};
    if (status) filter.status = status;
    if (caseType) filter.caseType = caseType;
    if (lawyerId && mongoose.Types.ObjectId.isValid(lawyerId)) filter.lawyerId = lawyerId;
    if (judgeId && mongoose.Types.ObjectId.isValid(judgeId)) filter.assignedJudgeId = judgeId;
    if (search) {
      filter.$or = [
        { caseNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { applicant: { $regex: search, $options: 'i' } },
        { respondent: { $regex: search, $options: 'i' } },
      ];
    }

    if (req.user.role === 'lawyer') filter.lawyerId = req.user.id;
    if (req.user.role === 'judge') filter.assignedJudgeId = req.user.id;
    if (req.user.role === 'citizen') filter.citizenId = req.user.id;

    const total = await Case.countDocuments(filter);
    const cases = await Case.find(filter)
      .populate('lawyerId', 'name email')
      .populate('assignedJudgeId', 'name email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      cases: cases.map((c) => ({
        id: c._id,
        caseNumber: c.caseNumber,
        title: c.title,
        status: c.status,
        caseType: c.caseType,
        applicant: c.applicant,
        respondent: c.respondent,
        filedDate: c.filedDate,
        lawyer: c.lawyerId ? { id: c.lawyerId._id, name: c.lawyerId.name, email: c.lawyerId.email } : null,
        judge: c.assignedJudgeId ? { id: c.assignedJudgeId._id, name: c.assignedJudgeId.name } : null,
        createdAt: c.createdAt,
      })),
      pagination: { page, limit, total },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cases/:caseId
router.get('/:caseId', authenticate, async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ error: 'Invalid case ID' });
    }

    const c = await Case.findById(caseId)
      .populate('lawyerId', 'name email phone')
      .populate('assignedJudgeId', 'name email');

    if (!c) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (req.user.role === 'lawyer' && c.lawyerId && c.lawyerId._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'citizen' && c.citizenId && c.citizenId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      id: c._id,
      caseNumber: c.caseNumber,
      title: c.title,
      status: c.status,
      description: c.description,
      applicant: c.applicant,
      respondent: c.respondent,
      caseType: c.caseType,
      filedDate: c.filedDate,
      lawyer: c.lawyerId ? { id: c.lawyerId._id, name: c.lawyerId.name, email: c.lawyerId.email, phone: c.lawyerId.phone } : null,
      judge: c.assignedJudgeId ? { id: c.assignedJudgeId._id, name: c.assignedJudgeId.name, email: c.assignedJudgeId.email } : null,
      citizenId: c.citizenId || null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cases/:caseId
router.put('/:caseId', authenticate, authorize('lawyer', 'admin', 'clerk'), async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ error: 'Invalid case ID' });
    }

    const c = await Case.findById(caseId);
    if (!c) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (req.user.role === 'lawyer' && c.lawyerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own cases' });
    }

    const { title, description, status } = req.body;
    if (status && !['Pending', 'Ongoing', 'Closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (title !== undefined) c.title = title;
    if (description !== undefined) c.description = description;
    if (status !== undefined) c.status = status;

    await c.save();

    createAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'case_updated',
      description: `Case updated: ${c.caseNumber}`,
      resourceType: 'case',
      resourceId: c._id.toString(),
      ipAddress: req.ip,
    });

    res.json({ message: 'Case updated successfully', case: c });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cases/:caseId/assign
router.post('/:caseId/assign', authenticate, authorize('admin', 'clerk'), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { judgeId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ error: 'Invalid case ID' });
    }
    if (!judgeId || !mongoose.Types.ObjectId.isValid(judgeId)) {
      return res.status(400).json({ error: 'Valid judgeId is required' });
    }

    const c = await Case.findById(caseId);
    if (!c) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const judge = await User.findById(judgeId);
    if (!judge || judge.role !== 'judge') {
      return res.status(404).json({ error: 'Judge not found' });
    }

    c.assignedJudgeId = judgeId;
    c.status = 'Ongoing';
    await c.save();

    createAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'judge_assigned',
      description: `Judge ${judge.name} assigned to case ${c.caseNumber}`,
      resourceType: 'case',
      resourceId: c._id.toString(),
      ipAddress: req.ip,
    });

    await notifyUser(judgeId, 'New Case Assignment', `You have been assigned as judge for case ${c.caseNumber}: ${c.title}`, 'case_assigned', c._id);
    await notifyUser(c.lawyerId, 'Judge Assigned', `Judge ${judge.name} has been assigned to your case ${c.caseNumber}`, 'case_assigned', c._id);

    res.json({
      message: 'Judge assigned successfully',
      case: {
        id: c._id,
        caseNumber: c.caseNumber,
        assignedJudgeId: c.assignedJudgeId,
        status: c.status,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cases/:caseId/hearings
router.get('/:caseId/hearings', authenticate, async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ error: 'Invalid case ID' });
    }

    const c = await Case.findById(caseId);
    if (!c) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const hearings = await Hearing.find({ caseId })
      .populate('judgeId', 'name email')
      .sort({ hearingDate: 1 });

    res.json({
      hearings: hearings.map((h) => ({
        id: h._id,
        hearingDate: h.hearingDate,
        hearingTime: h.hearingTime,
        location: h.location,
        description: h.description,
        status: h.status,
        outcome: h.outcome || null,
        notes: h.notes || null,
        judge: h.judgeId ? { id: h.judgeId._id, name: h.judgeId.name } : null,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
