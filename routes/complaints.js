const express = require('express');
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { authenticate, authorize } = require('../middlewares/auth');
const { createAuditLog } = require('../middlewares/auditLogger');

const router = express.Router();
const VALID_CATEGORIES = Complaint.CATEGORIES;

function categoryLabel(cat) {
  const labels = {
    scheduling: 'Scheduling & hearings',
    documents: 'Documents & case file',
    portal: 'Portal & login',
    other: 'Other / escalation',
  };
  return labels[cat] || cat;
}

function staffRolesForCategory(category) {
  if (Complaint.CLERK_CATEGORIES.includes(category)) return ['clerk'];
  return ['admin'];
}

function canRespondToComplaint(userRole, category) {
  if (userRole === 'admin') return true;
  if (userRole === 'clerk') return Complaint.CLERK_CATEGORIES.includes(category);
  return false;
}

// POST /api/complaints
router.post('/', authenticate, async (req, res) => {
  try {
    const { subject, description, caseId, category } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ error: 'subject and description are required' });
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: 'category is required — scheduling, documents, portal, or other',
      });
    }

    const complaint = await Complaint.create({
      submittedBy: req.user.id,
      subject,
      description,
      category,
      caseId: caseId && mongoose.Types.ObjectId.isValid(caseId) ? caseId : null,
      status: 'pending',
    });

    createAuditLog({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'complaint_submitted',
      description: `Service request (${category}): ${subject}`,
      resourceType: 'complaint',
      resourceId: complaint._id.toString(),
      ipAddress: req.ip,
    });

    const roles = staffRolesForCategory(category);
    const staff = await User.find({ role: { $in: roles } }).select('_id');
    const routedTo = roles.includes('clerk') ? 'registry (clerk)' : 'court administration';
    for (const member of staff) {
      await Notification.create({
        userId: member._id,
        title: 'New Registry Inquiry',
        message: `[${categoryLabel(category)}] "${subject}" — routed to ${routedTo}`,
        type: 'complaint_submitted',
        relatedCaseId: caseId || null,
      });
    }

    res.status(201).json({
      message: `Service request submitted. It will be reviewed by ${routedTo}.`,
      complaint: {
        id: complaint._id,
        subject: complaint.subject,
        description: complaint.description,
        category: complaint.category,
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
    const { status, category, page: pg, limit: lm } = req.query;
    const page = parseInt(pg) || 1;
    const limit = parseInt(lm) || 10;

    const filter = {};
    if (status) filter.status = status;
    if (category && VALID_CATEGORIES.includes(category)) filter.category = category;

    if (req.user.role === 'citizen' || req.user.role === 'lawyer') {
      filter.submittedBy = req.user.id;
    } else if (req.user.role === 'clerk') {
      filter.category = { $in: Complaint.CLERK_CATEGORIES };
    } else if (req.user.role === 'admin') {
      filter.category = { $in: Complaint.ADMIN_CATEGORIES };
    }

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
        category: c.category,
        categoryLabel: categoryLabel(c.category),
        handledBy: Complaint.CLERK_CATEGORIES.includes(c.category) ? 'clerk' : 'admin',
        status: c.status,
        response: c.response || null,
        respondedAt: c.respondedAt || null,
        submittedBy: c.submittedBy
          ? { id: c.submittedBy._id, name: c.submittedBy.name, email: c.submittedBy.email, role: c.submittedBy.role }
          : null,
        case: c.caseId ? { id: c.caseId._id, caseNumber: c.caseId.caseNumber, title: c.caseId.title } : null,
        respondedBy: c.respondedBy ? { name: c.respondedBy.name } : null,
        createdAt: c.createdAt,
      })),
      pagination: { page, limit, total },
      queue: req.user.role === 'clerk' ? 'registry' : req.user.role === 'admin' ? 'administration' : null,
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

    if (!canRespondToComplaint(req.user.role, complaint.category)) {
      return res.status(403).json({
        error:
          req.user.role === 'clerk'
            ? 'Registry staff can only respond to scheduling and document inquiries. Portal and other requests are handled by court administration.'
            : 'Access denied',
      });
    }

    complaint.response = response;
    complaint.status = status;
    complaint.respondedBy = req.user.id;
    complaint.respondedAt = new Date();
    await complaint.save();

    await Notification.create({
      userId: complaint.submittedBy,
      title: 'Registry Inquiry Updated',
      message: `Your request "${complaint.subject}" has been ${status.replace('_', ' ')}`,
      type: 'general',
    });

    res.json({ message: 'Response submitted successfully', complaint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
