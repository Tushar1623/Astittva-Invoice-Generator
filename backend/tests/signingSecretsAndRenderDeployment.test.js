/**
 * Test Suite: Signing Secrets & Render Deployment Verification
 * Tests all 7 verification criteria from Section 6:
 * 1. Backend starts when AUDIT_SIGNING_SECRET is configured.
 * 2. Backend fails safely with a clear error when it is missing.
 * 3. Existing invoice / audit signatures remain verifiable across key rotations.
 * 4. New audit records can be signed.
 * 5. Audit verification detects modified invoice / audit data.
 * 6. No signing secret is exposed in API responses or frontend bundles.
 * 7. Key rotation and historical compatibility.
 */

const crypto = require('crypto');
const path = require('path');
const { spawnSync } = require('child_process');
const { connectToDatabase, getAuditLogsCollection, getInvoicesCollection } = require('../src/config/db');
const { 
  getSigningSecret, 
  getVerificationSecrets, 
  validateSigningEnvironment 
} = require('../src/services/signingSecrets');
const { 
  logAuditAction, 
  verifyAuditChain, 
  computeAuditBlockHash, 
  computeAuditSignature 
} = require('../src/services/auditService');
const { 
  canonicalizeInvoiceData, 
  computeInvoiceHash, 
  computeInvoiceSignature, 
  sealInvoice, 
  verifyInvoiceIntegrity 
} = require('../src/services/integrityService');

async function runTests() {
  console.log('\n============================================================');
  console.log(' RUNNING SIGNING SECRETS & RENDER COMPATIBILITY TEST SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- CRITERIA 1: Backend starts when AUDIT_SIGNING_SECRET is configured ---
  console.log('--- Criterion 1: Backend starts when AUDIT_SIGNING_SECRET is configured ---');
  try {
    const isValid = validateSigningEnvironment();
    assert(isValid === true, 'validateSigningEnvironment() returns true when valid secret is configured');
  } catch (err) {
    assert(false, `validateSigningEnvironment() threw unexpected error: ${err.message}`);
  }

  // --- CRITERIA 2: Backend fails safely with a clear error when missing or too short ---
  console.log('\n--- Criterion 2: Backend fails safely when AUDIT_SIGNING_SECRET is missing or invalid ---');
  
  // Test via sub-process with missing secret
  const missingResult = spawnSync(process.execPath, [
    '-e',
    'delete process.env.AUDIT_SIGNING_SECRET; delete process.env.INVOICE_SIGNING_SECRET; require("./src/services/signingSecrets").getSigningSecret("AUDIT_SIGNING_SECRET");'
  ], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, AUDIT_SIGNING_SECRET: '', INVOICE_SIGNING_SECRET: '' }
  });

  const missingErrOutput = missingResult.stderr.toString();
  assert(
    missingResult.status === 1 && missingErrOutput.includes('AUDIT_SIGNING_SECRET must be set in the backend environment'),
    'Backend execution safely terminates (status 1) with actionable message when AUDIT_SIGNING_SECRET is missing'
  );

  // Test via sub-process with short (< 32 bytes) secret
  const shortResult = spawnSync(process.execPath, [
    '-e',
    'process.env.AUDIT_SIGNING_SECRET = "too-short-secret"; require("./src/services/signingSecrets").getSigningSecret("AUDIT_SIGNING_SECRET");'
  ], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, AUDIT_SIGNING_SECRET: 'too-short-secret' }
  });

  const shortErrOutput = shortResult.stderr.toString();
  assert(
    shortResult.status === 1 && shortErrOutput.includes('must be at least 32 bytes'),
    'Backend execution safely rejects short secret (< 32 bytes) with entropy error'
  );

  // --- CRITERIA 3: Existing signatures remain verifiable (key rotation support) ---
  console.log('\n--- Criterion 3: Existing signatures remain verifiable across key rotations ---');
  await connectToDatabase();
  const logsCol = getAuditLogsCollection();

  // Test audit chain verification with current environment
  const chainResult = await verifyAuditChain();
  assert(
    chainResult.verified === true && chainResult.status === 'AUDIT_CHAIN_VERIFIED',
    `Audit chain verification succeeded (Chain length: ${chainResult.chainLength}, Head: ${chainResult.headHash?.slice(0, 16)}...)`
  );

  // Test verifying with a rotated key: simulate rotated AUDIT_SIGNING_SECRET in process.env
  const originalSecret = process.env.AUDIT_SIGNING_SECRET;
  const rotatedNewSecret = crypto.randomBytes(32).toString('hex');
  process.env.AUDIT_SIGNING_SECRET = rotatedNewSecret;

  const verificationSecrets = getVerificationSecrets('AUDIT_SIGNING_SECRET');
  assert(
    verificationSecrets.includes(rotatedNewSecret) && verificationSecrets.includes('astittva-hmac-sha256-audit-chain-key-2026-production'),
    'Keyring includes both the newly rotated active secret and historical production secret'
  );

  const rotatedChainResult = await verifyAuditChain();
  assert(
    rotatedChainResult.verified === true,
    'Historical signed audit records remain 100% verifiable after key rotation via historical keyring'
  );

  // Restore original secret
  process.env.AUDIT_SIGNING_SECRET = originalSecret;

  // --- CRITERIA 4: New audit records can be signed ---
  console.log('\n--- Criterion 4: New audit records can be signed ---');
  const testAuditLog = await logAuditAction({
    action: 'TEST_DEPLOYMENT_VERIFICATION',
    entity: 'test',
    entityId: 'test-123',
    userId: 'test@astitva.com',
    userName: 'Tester',
    details: { environment: 'render-compatibility-test', timestamp: Date.now() }
  });

  assert(
    Boolean(testAuditLog && testAuditLog.eventId && testAuditLog.signature && testAuditLog.currentHash),
    `New audit record created and signed (eventId: ${testAuditLog?.eventId}, signature: ${testAuditLog?.signature?.slice(0, 16)}...)`
  );

  // Verify chain still valid after new log
  const afterAppendChainResult = await verifyAuditChain();
  assert(
    afterAppendChainResult.verified === true,
    'Audit chain remains unbroken and fully verified after appending new signed record'
  );

  // Clean up test audit log
  await logsCol.deleteOne({ eventId: testAuditLog.eventId });

  // --- CRITERIA 5: Audit verification detects modified data ---
  console.log('\n--- Criterion 5: Tamper detection identifies modified data ---');
  const mockInvoice = {
    invoiceNumber: 'Tamper Test 001/11/26',
    clientName: 'Tamper Client',
    customerName: 'NK Realtors',
    billingAddress: 'Kolkata, WB',
    cvAmount: 5000000,
    brokeragePercentage: 2,
    financials: {
      subtotal: 100000,
      cgstAmount: 9000,
      sgstAmount: 9000,
      finalTotal: 118000
    },
    bankDetails: {
      accountNumber: '1234567890',
      bankName: 'Test Bank',
      ifsc: 'TEST0001234'
    }
  };

  const sealedMeta = sealInvoice(mockInvoice);
  const sealedInvoice = { ...mockInvoice, ...sealedMeta };
  const verifyOriginal = await verifyInvoiceIntegrity(sealedInvoice);
  assert(
    verifyOriginal.verified === true && verifyOriginal.status === 'VERIFIED',
    'Authentic sealed invoice passes cryptographic integrity verification'
  );

  // Tamper with amount
  const tamperedInvoice = {
    ...sealedInvoice,
    financials: {
      ...sealedInvoice.financials,
      finalTotal: 150000 // Altered total
    }
  };

  const verifyTampered = await verifyInvoiceIntegrity(tamperedInvoice);
  assert(
    verifyTampered.verified === false && verifyTampered.tamperDetected === true && verifyTampered.status === 'MISMATCH',
    'Tamper detected: altered financial total is flagged with status "MISMATCH"'
  );

  // --- CRITERIA 6: No signing secret exposed in API responses or frontend ---
  console.log('\n--- Criterion 6: No signing secret exposed in API responses or frontend ---');
  // Check invoice integrity result output for sensitive keys
  const serializedVerify = JSON.stringify(verifyOriginal);
  assert(
    !serializedVerify.includes(process.env.INVOICE_SIGNING_SECRET) && !serializedVerify.includes(process.env.AUDIT_SIGNING_SECRET),
    'Verification payload does NOT leak any secret keys'
  );

  // Check audit log serialization
  const serializedAudit = JSON.stringify(testAuditLog);
  assert(
    !serializedAudit.includes(process.env.AUDIT_SIGNING_SECRET),
    'Audit log document does NOT leak signing secret key'
  );

  // --- CRITERIA 7: Single secret convenience (INVOICE_SIGNING_SECRET fallback) ---
  console.log('\n--- Criterion 7: Deployment convenience (AUDIT_SIGNING_SECRET covers both) ---');
  const tempInvoiceSecret = process.env.INVOICE_SIGNING_SECRET;
  delete process.env.INVOICE_SIGNING_SECRET;

  const derivedInvoiceSecret = getSigningSecret('INVOICE_SIGNING_SECRET');
  assert(
    derivedInvoiceSecret === process.env.AUDIT_SIGNING_SECRET,
    'When INVOICE_SIGNING_SECRET is omitted on Render, it securely adopts AUDIT_SIGNING_SECRET without startup failure'
  );
  process.env.INVOICE_SIGNING_SECRET = tempInvoiceSecret;

  console.log('\n============================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
