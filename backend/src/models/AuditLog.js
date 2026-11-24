const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    index: true
  },
  entity: {
    type: String,
    default: 'invoice'
  },
  entityId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  userId: {
    type: String,
    default: 'system'
  },
  userName: {
    type: String,
    default: 'System'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  collection: 'auditLogs'
});

AuditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
