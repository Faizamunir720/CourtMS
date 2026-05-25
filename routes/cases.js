const express = require('express');
const mongoose = require('mongoose');
const Case = require('../models/Case');
const User = require('../models/User');
const Hearing = require('../models/Hearing');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middlewares/auth');
const { createAuditLog } = require('../middlewares/auditLogger');

const router = express.Router();
const VALID_STATUSES = Case.schema.path('status').enumValues;

async function notifyUser(userId, title, message, type, relatedCaseId = null) {
  if (!userId) return;
  try {
    await Notification.create({ userId, title, message, type, relatedCaseId });
  } catch (e) {
    console.error('Notification error:', e.message);
  }
}

// POST /api/cases/submit — citizen or lawyer files a new case (status: Submitted)
router.post('/submit', authenticate, authorize('citizen', 'lawyer'), async (req, res) => {
  try {
    const { title, description, applicant, respondent, caseType, filedDate, citizenId } = req.body;

    if (!title || !description || !applicant || !respondent || !caseType || !filedDate) {
      return res.status(400).json({ error: 'title, description, applicant, respondent, caseType, and filedDate are required' });
    }
    if (!['civil', 'criminal', 'commercial'].includes(caseType)) {
      return res.status(400).json({ error: 'caseType must be civil, criminal, or commercial' });
    }

    let lawyerId = null;
    let linkedCitizenId = null;

    let applicantName = applicant.trim();

    if (req.user.role === 'lawyer') {
      lawyerId = req.user.id;
      if (!citizenId || !mongoose.Types.ObjectId.isValid(citizenId)) {
        return res.status(400).json({
          error: 'citizenId is required — select the registered citizen client this case is for',
        });
      }
      const citizen = await User.findById(citizenId);
      if (!citizen || citizen.role !== 'citizen') {
        return res.status(400).json({ error: 'Invalid citizen account' });
      }
      linkedCitizenId = citizenId;
      if (!applicantName) applicantName = citizen.name;
    } else {
      linkedCitizenId = req.user.id;
      const citizenUser = await User.findById(req.user.id);
      if (citizenUser && !applicantName) applicantName = citizenUser.name;
    }

    const tempNumber = `SUB-${Date.now()}`;

    const newCase = await Case.create({
      caseNumber: tempNumber,
      title,
      description,
      applicant: applicantName,
      respondent,
      caseType,
      filedDate,
      lawyerId,
      citizenId: linkedCitizenId,
      submittedByRole: req.user.role,
      status: 'Submitted',
    });

    createAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'case_created',
      description: `Case submitted: ${tempNumber} - ${title}`,
      resourceType: 'case',
      resourceId: newCase._id.toString(),
      ipAddress: req.ip,
    });

    if (req.user.role === 'lawyer' && linkedCitizenId) {
      await notifyUser(
        linkedCitizenId,
        'Case Filed by Your Lawyer',
        `Your lawyer filed a new case "${title}". It will appear in your portal after the clerk registers it.`,
        'case_assigned',
        newCase._id
      );
    }

    res.status(201).json({
      message: req.user.role === 'lawyer'
        ? 'Case filed for your client. They can track it in their citizen portal once the clerk registers it.'
        : 'Case submitted successfully. A clerk will register it and can assign a lawyer if you are self-represented.',
      case: {
        id: newCase._id,
        caseNumber: newCase.caseNumber,
        title: newCase.title,
        status: newCase.status,
        createdAt: newCase.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cases/:caseId/register — clerk assigns official case ID (status: Registered)
router.post('/:caseId/register', authenticate, authorize('clerk'), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { caseNumber, lawyerId, representation, changeCounsel } = req.body;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ error: 'Invalid case ID' });
    }
    if (!caseNumber) {
      return res.status(400).json({ error: 'Official case number is required (e.g. CIV-2026-001)' });
    }

    const c = await Case.findById(caseId);
    if (!c) {
      return res.status(404).json({ error: 'Case not found' });
    }
    if (c.status !== 'Submitted') {
      return res.status(400).json({ error: 'Only submitted cases can be registered' });
    }

    const duplicate = await Case.findOne({ caseNumber, _id: { $ne: caseId } });
    if (duplicate) {
      return res.status(409).json({ error: 'Case number already exists' });
    }

    const hadLawyer = Boolean(c.lawyerId);
    const filingLawyerId = c.lawyerId ? c.lawyerId.toString() : null;
    const filedAsLawyer =
      c.submittedByRole === 'lawyer'
      || (c.submittedByRole === 'citizen' && c.lawyerId && String(c.caseNumber).startsWith('SUB-'))
      || (!c.submittedByRole && !!c.lawyerId);
    const filedAsCitizen = !filedAsLawyer && (c.submittedByRole === 'citizen' || !c.lawyerId);

    async function assignLawyer(id) {
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return 'Invalid lawyer selected';
      }
      const lawyer = await User.findById(id);
      if (!lawyer || lawyer.role !== 'lawyer') {
        return 'Invalid lawyer';
      }
      c.lawyerId = id;
      return null;
    }

    if (filedAsLawyer && filingLawyerId) {
      if (representation === 'change_counsel') {
        if (!changeCounsel) {
          return res.status(400).json({ error: 'Counsel change requires explicit confirmation (substitution / court order).' });
        }
        if (!lawyerId || lawyerId === filingLawyerId) {
          return res.status(400).json({ error: 'Select a different lawyer when recording a counsel change.' });
        }
        const errMsg = await assignLawyer(lawyerId);
        if (errMsg) return res.status(400).json({ error: errMsg });
      }
    } else if (filedAsCitizen) {
      if (representation === 'pro_se' || representation === 'self_represented') {
        c.lawyerId = null;
      } else if (representation === 'assign_counsel') {
        if (!lawyerId) {
          return res.status(400).json({ error: 'Select the lawyer the citizen has engaged, or register as self-represented.' });
        }
        const errMsg = await assignLawyer(lawyerId);
        if (errMsg) return res.status(400).json({ error: errMsg });
      } else if (lawyerId && mongoose.Types.ObjectId.isValid(lawyerId)) {
        const errMsg = await assignLawyer(lawyerId);
        if (errMsg) return res.status(400).json({ error: errMsg });
      } else {
        c.lawyerId = null;
      }
    } else if (lawyerId && mongoose.Types.ObjectId.isValid(lawyerId)) {
      const errMsg = await assignLawyer(lawyerId);
      if (errMsg) return res.status(400).json({ error: errMsg });
    }

    c.caseNumber = caseNumber.trim();
    c.status = 'Registered';

    await c.save();

    createAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'case_updated',
      description: `Case registered: ${caseNumber}`,
      resourceType: 'case',
      resourceId: c._id.toString(),
      ipAddress: req.ip,
    });

    if (c.citizenId) {
      await notifyUser(c.citizenId, 'Case Registered', `Your case has been registered as ${caseNumber}`, 'case_assigned', c._id);
    }
    if (c.lawyerId) {
      await notifyUser(c.lawyerId, 'Case Registered', `Case ${caseNumber} is now registered in the court system`, 'case_assigned', c._id);
    }
    if (lawyerId && c.citizenId && c.submittedByRole === 'citizen' && !hadLawyer) {
      await notifyUser(
        c.citizenId,
        'Lawyer Assigned',
        `A lawyer has been assigned to your case ${caseNumber}`,
        'case_assigned',
        c._id
      );
    }

    res.json({
      message: 'Case registered successfully',
      case: { id: c._id, caseNumber: c.caseNumber, status: c.status },
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
      .populate('citizenId', 'name email')
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
        filedBy: c.submittedByRole || (c.lawyerId ? 'lawyer' : 'citizen'),
        submittedByRole: c.submittedByRole,
        citizen: c.citizenId ? { id: c.citizenId._id, name: c.citizenId.name, email: c.citizenId.email } : null,
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
      .populate('citizenId', 'name email phone')
      .populate('assignedJudgeId', 'name email');

    if (!c) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (req.user.role === 'lawyer' && (!c.lawyerId || c.lawyerId._id.toString() !== req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'citizen' && (!c.citizenId || c.citizenId._id.toString() !== req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'judge' && (!c.assignedJudgeId || c.assignedJudgeId._id.toString() !== req.user.id)) {
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
      filedBy: c.submittedByRole || (c.lawyerId ? 'lawyer' : 'citizen'),
      submittedByRole: c.submittedByRole,
      citizen: c.citizenId ? { id: c.citizenId._id, name: c.citizenId.name, email: c.citizenId.email, phone: c.citizenId.phone } : null,
      lawyer: c.lawyerId ? { id: c.lawyerId._id, name: c.lawyerId.name, email: c.lawyerId.email, phone: c.lawyerId.phone } : null,
      judge: c.assignedJudgeId ? { id: c.assignedJudgeId._id, name: c.assignedJudgeId.name, email: c.assignedJudgeId.email } : null,
      citizenId: c.citizenId ? c.citizenId._id : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cases/:caseId — clerk updates records; lawyer own case details
router.put('/:caseId', authenticate, authorize('lawyer', 'clerk'), async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ error: 'Invalid case ID' });
    }

    const c = await Case.findById(caseId);
    if (!c) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (req.user.role === 'lawyer' && c.lawyerId && c.lawyerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own cases' });
    }

    const { title, description, status } = req.body;

    if (req.user.role === 'lawyer') {
      if (c.status !== 'Submitted') {
        return res.status(400).json({ error: 'Lawyers can only edit cases before registration' });
      }
      if (title !== undefined) c.title = title;
      if (description !== undefined) c.description = description;
    }

    if (req.user.role === 'clerk') {
      if (title !== undefined) c.title = title;
      if (description !== undefined) c.description = description;
      if (status !== undefined) {
        if (!VALID_STATUSES.includes(status)) {
          return res.status(400).json({ error: 'Invalid status' });
        }
        c.status = status;
      }
    }

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

    if (req.user.role === 'lawyer' && (!c.lawyerId || c.lawyerId.toString() !== req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'citizen' && (!c.citizenId || c.citizenId.toString() !== req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'judge' && (!c.assignedJudgeId || c.assignedJudgeId.toString() !== req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
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
