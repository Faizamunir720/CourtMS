const AuditLog = require('../models/AuditLog');

function createAuditLog({ userId, userEmail, userRole, action, description, resourceType, resourceId, ipAddress }) {
  AuditLog.create({
    userId: userId || null,
    userEmail: userEmail || '',
    userRole: userRole || '',
    action,
    description,
    resourceType,
    resourceId,
    ipAddress,
  }).catch((err) => {
    console.error('Audit log error:', err.message);
  });
}

function auditMiddleware(action, getDescription) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      if (res.statusCode < 400) {
        createAuditLog({
          userId: req.user ? req.user.id : null,
          userEmail: req.user ? req.user.email : '',
          userRole: req.user ? req.user.role : '',
          action,
          description: typeof getDescription === 'function' ? getDescription(req, data) : action,
          resourceType: req.params.caseId ? 'case' : req.params.hearingId ? 'hearing' : '',
          resourceId: req.params.caseId || req.params.hearingId || '',
          ipAddress: req.ip || '',
        });
      }
      return originalJson(data);
    };
    next();
  };
}

module.exports = { createAuditLog, auditMiddleware };
