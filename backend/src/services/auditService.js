const { getAuditLogsCollection } = require('../config/db');

async function logAuditAction({
  action,
  entity = 'invoice',
  entityId = null,
  userId = 'system',
  userName = 'System',
  details = {},
  ip = null
}) {
  try {
    const logs = getAuditLogsCollection();
    const doc = {
      action,
      entity,
      entityId: entityId ? String(entityId) : null,
      userId,
      userName,
      details,
      ip,
      timestamp: new Date()
    };
    await logs.insertOne(doc);
    return doc;
  } catch (err) {
    console.warn('[Audit] Failed to record audit log:', err.message);
    return null;
  }
}

module.exports = {
  logAuditAction
};
