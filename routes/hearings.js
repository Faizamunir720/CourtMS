const express = require('express');
const mongoose = require('mongoose');
const Hearing = require('../models/Hearing');
const Case = require('../models/Case');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middlewares/auth');
const { createAuditLog } = require('../middlewares/auditLogger');

const router = express.Router();

async function notifyUser(userId, title, message, type, relatedCaseId = null, relatedHearingId = null) {
  try {
    await Notification.create({ userId, title, message, type, relatedCaseId, relatedHearingId });
  } catch (e) {
    console.error('Notification error:', e.message);
  }
}

// GET /api/hearings
router.get('/', authenticate, async (req, res) => {
  try {
    const { judgeId, caseId, status, search, page: pg, limit: lm } = req.query;
    const page = parseInt(pg) || 1;
    const limit = parseInt(lm) || 10;

    const filter = {};
    if (caseId && mongoose.Types.ObjectId.isValid(caseId)) filter.caseId = caseId;
    if (status) filter.status = status;

    if (req.user.role === 'judge') {
      filter.judgeId = req.user.id;
    } else if (judgeId && mongoose.Types.ObjectId.isValid(judgeId)) {
      filter.judgeId = judgeId;
    }

    const searchTrim = search && String(search).trim();
    if (searchTrim) {
      const re = { $regex: searchTrim, $options: 'i' };
      const matchingCases = await Case.find({
        $or: [{ caseNumber: re }, { title: re }, { applicant: re }, { respondent: re }],
      }).select('_id');
      const caseIds = matchingCases.map((c) => c._id);
      const searchOr = [{ location: re }];
      if (caseIds.length) searchOr.push({ caseId: { $in: caseIds } });
      filter.$or = searchOr;
    }

    const total = await Hearing.countDocuments(filter);
    const hearings = await Hearing.find(filter)
      .populate('caseId', 'caseNumber title status')
      .populate('judgeId', 'name email')
      .skip((page - 1) * limit)
      .limit(limit)
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
        case: h.caseId ? { id: h.caseId._id, caseNumber: h.caseId.caseNumber, title: h.caseId.title, status: h.caseId.status } : null,
        judge: h.judgeId ? { id: h.judgeId._id, name: h.judgeId.name } : null,
        createdAt: h.createdAt,
      })),
      pagination: { page, limit, total },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hearings
router.post('/', authenticate, authorize('clerk'), async (req, res) => {
  try {
    const { caseId, hearingDate, hearingTime, location, description, judgeId } = req.body;

    if (!caseId || !hearingDate || !hearingTime || !location || !judgeId) {
      return res.status(400).json({ error: 'caseId, hearingDate, hearingTime, location, and judgeId are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ error: 'Invalid case ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(judgeId)) {
      return res.status(400).json({ error: 'Invalid judge ID' });
    }
    if (!/^\d{2}:\d{2}$/.test(hearingTime)) {
      return res.status(400).json({ error: 'hearingTime must be in HH:MM format' });
    }

    const c = await Case.findById(caseId);
    if (!c) {
      return res.status(404).json({ error: 'Case not found' });
    }
    if (!['Registered', 'Ongoing', 'Adjourned', 'Hearing Scheduled'].includes(c.status)) {
      return res.status(400).json({ error: 'Case must be registered before scheduling a hearing' });
    }

    const judge = await User.findById(judgeId);
    if (!judge || judge.role !== 'judge') {
      return res.status(404).json({ error: 'Judge not found' });
    }

    const conflict = await Hearing.findOne({
      judgeId,
      hearingDate: new Date(hearingDate),
      hearingTime,
      status: 'Scheduled',
    });
    if (conflict) {
      return res.status(409).json({ error: 'Judge already has a hearing scheduled at this date and time' });
    }

    const hearing = await Hearing.create({
      caseId,
      hearingDate,
      hearingTime,
      location,
      description,
      judgeId,
      status: 'Scheduled',
    });

    c.assignedJudgeId = judgeId;
    c.status = 'Hearing Scheduled';
    await c.save();

    createAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'hearing_scheduled',
      description: `Hearing scheduled for case ${c.caseNumber} on ${hearingDate} at ${hearingTime}`,
      resourceType: 'hearing',
      resourceId: hearing._id.toString(),
      ipAddress: req.ip,
    });

    await notifyUser(judgeId, 'Hearing Scheduled', `A hearing for case ${c.caseNumber} has been scheduled on ${hearingDate} at ${hearingTime}`, 'hearing_scheduled', caseId, hearing._id);
    if (c.lawyerId) {
      await notifyUser(c.lawyerId, 'Hearing Scheduled', `A hearing for your case ${c.caseNumber} has been scheduled on ${hearingDate} at ${hearingTime}`, 'hearing_scheduled', caseId, hearing._id);
    }
    if (c.citizenId) {
      await notifyUser(c.citizenId, 'Hearing Scheduled', `Your case ${c.caseNumber} hearing is on ${hearingDate} at ${hearingTime} — ${location}`, 'hearing_scheduled', caseId, hearing._id);
    }

    res.status(201).json({
      message: 'Hearing scheduled successfully',
      hearing: {
        id: hearing._id,
        caseId: hearing.caseId,
        hearingDate: hearing.hearingDate,
        hearingTime: hearing.hearingTime,
        location: hearing.location,
        judgeId: hearing.judgeId,
        status: hearing.status,
        createdAt: hearing.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hearings/:hearingId
router.get('/:hearingId', authenticate, async (req, res) => {
  try {
    const { hearingId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(hearingId)) {
      return res.status(400).json({ error: 'Invalid hearing ID' });
    }

    const hearing = await Hearing.findById(hearingId)
      .populate('caseId', 'caseNumber title status')
      .populate('judgeId', 'name email');

    if (!hearing) {
      return res.status(404).json({ error: 'Hearing not found' });
    }

    res.json({
      id: hearing._id,
      caseId: hearing.caseId,
      hearingDate: hearing.hearingDate,
      hearingTime: hearing.hearingTime,
      location: hearing.location,
      description: hearing.description,
      judge: hearing.judgeId ? { id: hearing.judgeId._id, name: hearing.judgeId.name } : null,
      status: hearing.status,
      outcome: hearing.outcome || null,
      notes: hearing.notes || null,
      createdAt: hearing.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/hearings/:hearingId
router.put('/:hearingId', authenticate, authorize('clerk'), async (req, res) => {
  try {
    const { hearingId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(hearingId)) {
      return res.status(400).json({ error: 'Invalid hearing ID' });
    }

    const hearing = await Hearing.findById(hearingId).populate('caseId', 'caseNumber lawyerId');
    if (!hearing) {
      return res.status(404).json({ error: 'Hearing not found' });
    }

    const { hearingDate, hearingTime, location, description, status } = req.body;
    const oldStatus = hearing.status;

    if (hearingDate !== undefined) hearing.hearingDate = hearingDate;
    if (hearingTime !== undefined) hearing.hearingTime = hearingTime;
    if (location !== undefined) hearing.location = location;
    if (description !== undefined) hearing.description = description;
    if (status !== undefined) {
      if (!['Scheduled', 'Completed', 'Adjourned', 'Postponed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      hearing.status = status;
    }

    await hearing.save();

    if (status && status !== oldStatus && (status === 'Postponed' || status === 'Adjourned')) {
      const c = hearing.caseId;
      if (c) {
        await notifyUser(hearing.judgeId, 'Hearing Status Updated', `Hearing for case ${c.caseNumber} has been ${status.toLowerCase()}`, 'hearing_postponed', c._id, hearing._id);
        await notifyUser(c.lawyerId, 'Hearing Status Updated', `Your hearing for case ${c.caseNumber} has been ${status.toLowerCase()}`, 'hearing_postponed', c._id, hearing._id);
      }
    }

    res.json({ message: 'Hearing updated successfully', hearing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/hearings/:hearingId/outcome
router.put('/:hearingId/outcome', authenticate, authorize('judge'), async (req, res) => {
  try {
    const { hearingId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(hearingId)) {
      return res.status(400).json({ error: 'Invalid hearing ID' });
    }

    const { status, outcome, notes } = req.body;
    if (!status || !['Completed', 'Adjourned', 'Postponed'].includes(status)) {
      return res.status(400).json({ error: 'status must be Completed, Adjourned, or Postponed' });
    }
    if (!outcome) {
      return res.status(400).json({ error: 'outcome is required' });
    }

    const hearing = await Hearing.findById(hearingId).populate('caseId', 'caseNumber lawyerId');
    if (!hearing) {
      return res.status(404).json({ error: 'Hearing not found' });
    }

    if (hearing.judgeId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the assigned judge can update this hearing' });
    }

    hearing.status = status;
    hearing.outcome = outcome;
    if (notes !== undefined) hearing.notes = notes;
    await hearing.save();

    createAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'hearing_outcome_recorded',
      description: `Outcome recorded for hearing ${hearingId}: ${status}`,
      resourceType: 'hearing',
      resourceId: hearing._id.toString(),
      ipAddress: req.ip,
    });

    const c = await Case.findById(hearing.caseId);
    if (c) {
      if (status === 'Completed') {
        c.status = 'Closed';
        await c.save();
        if (c.lawyerId) await notifyUser(c.lawyerId, 'Case Closed', `Your case ${c.caseNumber} has been decided and closed`, 'case_closed', c._id, hearing._id);
        if (c.citizenId) await notifyUser(c.citizenId, 'Case Closed', `Your case ${c.caseNumber} has been decided and closed`, 'case_closed', c._id, hearing._id);
      } else if (status === 'Adjourned' || status === 'Postponed') {
        c.status = 'Adjourned';
        await c.save();
      }
    }

    res.json({ message: 'Hearing outcome recorded successfully', hearing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
