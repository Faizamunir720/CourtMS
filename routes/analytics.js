const express = require('express');
const Case = require('../models/Case');
const Hearing = require('../models/Hearing');
const User = require('../models/User');
const Document = require('../models/Document');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// GET /api/analytics/overview (admin, clerk, judge)
router.get('/overview', authenticate, authorize('admin', 'judge'), async (req, res) => {
  try {
    const totalCases = await Case.countDocuments();
    const submittedCases = await Case.countDocuments({ status: 'Submitted' });
    const registeredCases = await Case.countDocuments({ status: 'Registered' });
    const hearingScheduledCases = await Case.countDocuments({ status: 'Hearing Scheduled' });
    const ongoingCases = await Case.countDocuments({ status: 'Ongoing' });
    const adjournedCases = await Case.countDocuments({ status: 'Adjourned' });
    const closedCases = await Case.countDocuments({ status: 'Closed' });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const hearingsThisMonth = await Hearing.countDocuments({ createdAt: { $gte: startOfMonth } });

    const totalUsers = await User.countDocuments();
    const totalLawyers = await User.countDocuments({ role: 'lawyer' });
    const totalJudges = await User.countDocuments({ role: 'judge' });
    const totalCitizens = await User.countDocuments({ role: 'citizen' });
    const totalDocuments = await Document.countDocuments();

    const casesByType = await Case.aggregate([
      { $group: { _id: '$caseType', count: { $sum: 1 } } },
    ]);

    const casesPerMonth = await Case.aggregate([
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);

    res.json({
      cases: {
        total: totalCases,
        submitted: submittedCases,
        registered: registeredCases,
        hearingScheduled: hearingScheduledCases,
        ongoing: ongoingCases,
        adjourned: adjournedCases,
        closed: closedCases,
      },
      hearingsThisMonth,
      users: { total: totalUsers, lawyers: totalLawyers, judges: totalJudges, citizens: totalCitizens },
      totalDocuments,
      casesByType: casesByType.map((c) => ({ type: c._id, count: c.count })),
      casesPerMonth: casesPerMonth.map((c) => ({
        label: `${c._id.year}-${String(c._id.month).padStart(2, '0')}`,
        count: c.count,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/judge-workload (admin, clerk)
router.get('/judge-workload', authenticate, authorize('admin', 'clerk'), async (req, res) => {
  try {
    const judges = await User.find({ role: 'judge' }).select('name email');
    const workload = await Promise.all(
      judges.map(async (judge) => {
        const activeCases = await Case.countDocuments({ assignedJudgeId: judge._id, status: { $ne: 'Closed' } });
        const scheduledHearings = await Hearing.countDocuments({ judgeId: judge._id, status: 'Scheduled' });
        const completedHearings = await Hearing.countDocuments({ judgeId: judge._id, status: 'Completed' });
        return {
          judge: { id: judge._id, name: judge.name, email: judge.email },
          activeCases,
          scheduledHearings,
          completedHearings,
        };
      })
    );
    res.json({ workload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/recent-activity (admin, clerk)
router.get('/recent-activity', authenticate, authorize('admin', 'judge'), async (req, res) => {
  try {
    const recentCases = await Case.find()
      .populate('lawyerId', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('caseNumber title status createdAt');

    const recentHearings = await Hearing.find()
      .populate('caseId', 'caseNumber title')
      .populate('judgeId', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('hearingDate hearingTime status createdAt');

    res.json({
      recentCases: recentCases.map((c) => ({
        id: c._id,
        caseNumber: c.caseNumber,
        title: c.title,
        status: c.status,
        lawyer: c.lawyerId ? c.lawyerId.name : null,
        createdAt: c.createdAt,
      })),
      recentHearings: recentHearings.map((h) => ({
        id: h._id,
        case: h.caseId ? { caseNumber: h.caseId.caseNumber, title: h.caseId.title } : null,
        hearingDate: h.hearingDate,
        hearingTime: h.hearingTime,
        status: h.status,
        judge: h.judgeId ? h.judgeId.name : null,
        createdAt: h.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
