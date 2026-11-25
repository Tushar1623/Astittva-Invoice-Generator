const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  eventId: {
    type: String,
    sparse: true,
    unique: true,
    index: true
  },
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
  userRole: {
    type: String,
    default: 'user'
  },
  status: {
    type: String,
    enum: ['success', 'rejected', 'failed'],
    default: 'success'
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip: {
    type: String,
    default: null
  },
  previousHash: {
    type: String,
    default: null,
    index: true
  },
  currentHash: {
    type: String,
    default: null,
    sparse: true,
    unique: true,
    index: true
  },
  signature: {
    type: String,
    default: null
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
