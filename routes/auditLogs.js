const express = require('express');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// GET /api/audit-logs (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { action, userRole, page: pg, limit: lm, search } = req.query;
    const page = parseInt(pg) || 1;
    const limit = parseInt(lm) || 20;

    const filter = {};
    if (action) filter.action = action;
    if (userRole) filter.userRole = userRole;
    if (search) {
      filter.$or = [
        { userEmail: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      logs: logs.map((l) => ({
        id: l._id,
        userId: l.userId,
        userEmail: l.userEmail,
        userRole: l.userRole,
        action: l.action,
        description: l.description,
        resourceType: l.resourceType,
        resourceId: l.resourceId,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
      pagination: { page, limit, total },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
