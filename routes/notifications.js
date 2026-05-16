const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const { isRead, page: pg, limit: lm } = req.query;
    const page = parseInt(pg) || 1;
    const limit = parseInt(lm) || 20;

    const filter = { userId: req.user.id };
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, isRead: false });

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      notifications: notifications.map((n) => ({
        id: n._id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        relatedCaseId: n.relatedCaseId || null,
        relatedHearingId: n.relatedHearingId || null,
        createdAt: n.createdAt,
      })),
      unreadCount,
      pagination: { page, limit, total },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:notifId/read
router.put('/:notifId/read', authenticate, async (req, res) => {
  try {
    const { notifId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(notifId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const notif = await Notification.findOne({ _id: notifId, userId: req.user.id });
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notif.isRead = true;
    await notif.save();

    res.json({ message: 'Notification marked as read', notification: notif });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/:notifId
router.delete('/:notifId', authenticate, async (req, res) => {
  try {
    const { notifId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(notifId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const notif = await Notification.findOneAndDelete({ _id: notifId, userId: req.user.id });
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
