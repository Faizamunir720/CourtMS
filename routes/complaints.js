const express = require('express');
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middlewares/auth');
const { createAuditLog } = require('../middlewares/auditLogger');

const router = express.Router();

// POST /api/complaints
router.post('/', authenticate, async (req, res) => {
  try {
    const { subject, description, caseId } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ error: 'subject and description are required' });
    }

    const complaint = await Complaint.create({
      submittedBy: req.user.id,
      subject,
      description,
      caseId: caseId && mongoose.Types.ObjectId.isValid(caseId) ? caseId : null,
      status: 'pending',
    });

    createAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'complaint_submitted',
      description: `Complaint submitted: ${subject}`,
      resourceType: 'complaint',
      resourceId: complaint._id.toString(),
      ipAddress: req.ip,
    });

    const admins = await mongoose.model('User').find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Complaint Submitted',
        message: `A new complaint has been submitted: "${subject}"`,
        type: 'complaint_submitted',
        relatedCaseId: caseId || null,
      });
    }

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint: {
        id: complaint._id,
        subject: complaint.subject,
        description: complaint.description,
        status: complaint.status,
        createdAt: complaint.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, page: pg, limit: lm } = req.query;
    const page = parseInt(pg) || 1;
    const limit = parseInt(lm) || 10;

    const filter = {};
    if (status) filter.status = status;
    if (req.user.role === 'citizen') filter.submittedBy = req.user.id;

    const total = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .populate('submittedBy', 'name email role')
      .populate('caseId', 'caseNumber title')
      .populate('respondedBy', 'name')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      complaints: complaints.map((c) => ({
        id: c._id,
        subject: c.subject,
        description: c.description,
        status: c.status,
        response: c.response || null,
        respondedAt: c.respondedAt || null,
        submittedBy: c.submittedBy ? { id: c.submittedBy._id, name: c.submittedBy.name, email: c.submittedBy.email } : null,
        case: c.caseId ? { id: c.caseId._id, caseNumber: c.caseId.caseNumber, title: c.caseId.title } : null,
        respondedBy: c.respondedBy ? { name: c.respondedBy.name } : null,
        createdAt: c.createdAt,
      })),
      pagination: { page, limit, total },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/complaints/:complaintId/respond (admin, clerk)
router.put('/:complaintId/respond', authenticate, authorize('admin', 'clerk'), async (req, res) => {
  try {
    const { complaintId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      return res.status(400).json({ error: 'Invalid complaint ID' });
    }

    const { response, status } = req.body;
    if (!response) {
      return res.status(400).json({ error: 'response is required' });
    }
    if (!status || !['under_review', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'status must be under_review, resolved, or dismissed' });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    complaint.response = response;
    complaint.status = status;
    complaint.respondedBy = req.user.id;
    complaint.respondedAt = new Date();
    await complaint.save();

    await Notification.create({
      userId: complaint.submittedBy,
      title: 'Complaint Updated',
      message: `Your complaint "${complaint.subject}" has been ${status.replace('_', ' ')}`,
      type: 'general',
    });

    res.json({ message: 'Complaint responded successfully', complaint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
