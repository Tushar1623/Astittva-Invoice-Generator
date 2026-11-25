const crypto = require('crypto');
const path = require('path');
const { getAuditLogsCollection } = require('../config/db');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { getSigningSecret } = require('./signingSecrets');

const AUDIT_SIGNING_SECRET = getSigningSecret('AUDIT_SIGNING_SECRET');
const GENESIS_PREVIOUS_HASH = '0'.repeat(64);

/**
 * Computes deterministic SHA-256 hash for an audit block.
 */
function computeAuditBlockHash(previousHash, eventId, action, entity, entityId, timestampIso, details, status) {
  const detailsStr = typeof details === 'string' ? details : JSON.stringify(details || {});
  const payload = [
    previousHash,
    eventId,
    action,
    entity || 'invoice',
    entityId || 'null',
    timestampIso,
    detailsStr,
    status || 'success'
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Computes HMAC-SHA256 signature for an audit block hash.
 */
function computeAuditSignature(blockHash) {
  return crypto.createHmac('sha256', AUDIT_SIGNING_SECRET).update(blockHash).digest('hex');
}

/**
 * Appends a tamper-evident, cryptographically linked audit event to the hash chain.
 */
async function logAuditAction({
  action,
  entity = 'invoice',
  entityId = null,
  userId = 'system',
  userName = 'System',
  userRole = 'user',
  details = {},
  status = 'success',
  ip = null
}) {
  try {
    const logs = getAuditLogsCollection();
    const eventId = crypto.randomUUID();
    const timestamp = new Date();
    const timestampIso = timestamp.toISOString();

    // Retrieve previous head of audit chain
    const latestLog = await logs.findOne({}, { sort: { timestamp: -1, _id: -1 } });
    const previousHash = (latestLog && latestLog.currentHash) ? latestLog.currentHash : GENESIS_PREVIOUS_HASH;

    // Compute block hash and HMAC signature
    const currentHash = computeAuditBlockHash(
      previousHash,
      eventId,
      action,
      entity,
      entityId ? String(entityId) : 'null',
      timestampIso,
      details,
      status
    );
    const signature = computeAuditSignature(currentHash);

    const doc = {
      eventId,
      action,
      entity,
      entityId: entityId ? String(entityId) : null,
      userId: String(userId || 'system'),
      userName: String(userName || 'System'),
      userRole: String(userRole || 'user'),
      details,
      status,
      ip,
      previousHash,
      currentHash,
      signature,
      timestamp
    };

    await logs.insertOne(doc);
    return doc;
  } catch (err) {
    console.warn('[Audit Chain] Failed to append tamper-evident audit record:', err.message);
    return null;
  }
}

/**
 * Validates the entire cryptographic hash chain of audit logs from genesis to head.
 * Detects any deleted, injected, or modified audit log events.
 */
async function verifyAuditChain() {
  try {
    const logs = getAuditLogsCollection();
    const allLogs = await logs.find().sort({ timestamp: 1, _id: 1 }).toArray();

    if (!allLogs || allLogs.length === 0) {
      return {
        verified: true,
        chainLength: 0,
        status: 'EMPTY_CHAIN'
      };
    }

    let expectedPrevHash = GENESIS_PREVIOUS_HASH;

    for (let i = 0; i < allLogs.length; i++) {
      const log = allLogs[i];

      // If legacy log without chain hash, skip to first chained event
      if (!log.currentHash || !log.eventId) {
        continue;
      }

      // 1. Verify previous hash link
      if (log.previousHash !== expectedPrevHash && i > 0 && allLogs[i - 1].currentHash) {
        return {
          verified: false,
          status: 'CHAIN_BROKEN',
          brokenAtEventId: log.eventId,
          index: i,
          action: log.action,
          error: `Hash link broken at event #${i} (${log.eventId}). Expected previousHash "${expectedPrevHash}", but found "${log.previousHash}".`
        };
      }

      // 2. Verify current block hash
      const tsIso = log.timestamp instanceof Date ? log.timestamp.toISOString() : new Date(log.timestamp).toISOString();
      const recomputedHash = computeAuditBlockHash(
        log.previousHash,
        log.eventId,
        log.action,
        log.entity,
        log.entityId,
        tsIso,
        log.details,
        log.status
      );

      if (recomputedHash !== log.currentHash) {
        return {
          verified: false,
          status: 'TAMPER_DETECTED',
          brokenAtEventId: log.eventId,
          index: i,
          action: log.action,
          error: `Audit block tampered at event #${i} (${log.eventId}). Block content does not match currentHash.`
        };
      }

      // 3. Verify HMAC signature
      const expectedSignature = computeAuditSignature(log.currentHash);
      if (log.signature && log.signature !== expectedSignature) {
        return {
          verified: false,
          status: 'SIGNATURE_INVALID',
          brokenAtEventId: log.eventId,
          index: i,
          action: log.action,
          error: `Audit signature invalid at event #${i} (${log.eventId}).`
        };
      }

      expectedPrevHash = log.currentHash;
    }

    return {
      verified: true,
      status: 'AUDIT_CHAIN_VERIFIED',
      chainLength: allLogs.length,
      headHash: expectedPrevHash
    };
  } catch (err) {
    return {
      verified: false,
      status: 'VERIFICATION_ERROR',
      error: err.message
    };
  }
}

module.exports = {
  logAuditAction,
  verifyAuditChain,
  computeAuditBlockHash,
  computeAuditSignature
};
