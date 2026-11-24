const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { 
  connectToDatabase, 
  getImportsCollection, 
  getInvoicesCollection, 
  getGridFSBucket, 
  getAuditLogsCollection,
  getCountersCollection 
} = require('../src/config/db');
const { ObjectId } = require('mongodb');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body || '{}') });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function runRemoveReceiptTest() {
  console.log('================================================================');
  console.log('       TEST: REMOVE RECEIPTS FROM IMPORT HISTORY MODULE         ');
  console.log('================================================================\n');

  await connectToDatabase();
  const importsCol = getImportsCollection();
  const invoicesCol = getInvoicesCollection();
  const bucket = getGridFSBucket();
  const auditCol = getAuditLogsCollection();
  const countersCol = getCountersCollection();

  // 1. Create a dummy test file in GridFS
  const dummyBuffer = Buffer.from('TEST_RECEIPT_PDF_DATA_CONTENT_12345');
  const uploadStream = bucket.openUploadStream('test_receipt_to_remove.pdf', {
    contentType: 'application/pdf'
  });
  await new Promise((resolve, reject) => {
    uploadStream.end(dummyBuffer, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  const gridFsFileId = uploadStream.id;
  console.log(`[SETUP] Uploaded test file to GridFS: ${gridFsFileId}`);

  // 2. Insert a Pending Verification record into invoiceImports
  const pendingDoc = {
    originalFilename: 'test_receipt_to_remove.pdf',
    fileHash: 'test_hash_pending_12345',
    gridFsFileId,
    mimeType: 'application/pdf',
    fileSize: dummyBuffer.length,
    status: 'pending_verification',
    extractedData: { invoiceNumber: '999/11/26', clientName: 'Test Client' },
    createdAt: new Date()
  };
  const insertPending = await importsCol.insertOne(pendingDoc);
  const pendingId = insertPending.insertedId;
  console.log(`[SETUP] Inserted pending import record: ${pendingId}`);

  // 3. Test DELETE /api/imports/:id on Pending Verification record
  console.log('\n--- 1. Testing Removal of Pending Verification Record ---');
  const delPendingRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/imports/${pendingId}`,
    method: 'DELETE'
  });

  console.log(`Delete response status: ${delPendingRes.status}`);
  console.log(`Delete message: "${delPendingRes.data.message}"`);

  if (delPendingRes.status !== 200 || !delPendingRes.data.success) {
    throw new Error('Failed to delete pending import record');
  }

  // Verify removed from invoiceImports
  const checkPending = await importsCol.findOne({ _id: pendingId });
  if (checkPending) throw new Error('Pending import record still exists in invoiceImports!');
  console.log('✓ PASS: Record successfully removed from import history queue');

  // Verify GridFS file was PRESERVED
  const checkGridFsFile = await bucket.find({ _id: gridFsFileId }).toArray();
  if (!checkGridFsFile || checkGridFsFile.length === 0) {
    throw new Error('FAIL: GridFS file was deleted! It must be preserved.');
  }
  console.log('✓ PASS: Original receipt file in GridFS is strictly preserved');

  // Verify Audit Log recorded
  const auditEntry = await auditCol.findOne({ action: 'IMPORT_REMOVE', entityId: String(pendingId) });
  if (!auditEntry) throw new Error('FAIL: No audit log entry recorded for IMPORT_REMOVE!');
  console.log(`✓ PASS: Audit log entry recorded with action: "${auditEntry.action}"`);

  // 4. Test Removal of Verified & Saved Record
  console.log('\n--- 2. Testing Removal of Verified & Saved Record ---');
  // Create an invoice first
  const testInvoice = {
    invoiceNumber: 'Test Verified 099/11/2026',
    serialNumber: 99,
    month: 11,
    year: 2026,
    clientName: 'Test Verified',
    customerName: 'NK Realtors',
    status: 'active',
    financials: { taxableAmount: 50000, finalTotal: 59000 },
    createdAt: new Date()
  };
  const insertInv = await invoicesCol.insertOne(testInvoice);
  const testInvId = insertInv.insertedId;

  // Insert a verified import record pointing to testInvId
  const verifiedDoc = {
    originalFilename: 'verified_receipt.pdf',
    fileHash: 'test_hash_verified_12345',
    gridFsFileId,
    status: 'verified',
    verifiedInvoiceId: testInvId,
    verifiedInvoiceNumber: testInvoice.invoiceNumber,
    createdAt: new Date()
  };
  const insertVerified = await importsCol.insertOne(verifiedDoc);
  const verifiedId = insertVerified.insertedId;
  console.log(`[SETUP] Inserted verified import record: ${verifiedId} linked to invoice: ${testInvId}`);

  // Record counter before removal
  const counterBefore = await countersCol.findOne({ _id: '2026-11' });

  // Call DELETE /api/imports/:id on verified record
  const delVerifiedRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/imports/${verifiedId}`,
    method: 'DELETE'
  });

  console.log(`Delete verified response status: ${delVerifiedRes.status}`);
  console.log(`Delete verified message: "${delVerifiedRes.data.message}"`);

  if (delVerifiedRes.status !== 200 || !delVerifiedRes.data.success) {
    throw new Error('Failed to delete verified import record');
  }

  // Verify import queue entry removed
  const checkVerifiedQueue = await importsCol.findOne({ _id: verifiedId });
  if (checkVerifiedQueue) throw new Error('FAIL: Verified entry still in invoiceImports queue!');
  console.log('✓ PASS: Verified entry removed from import queue');

  // Verify associated invoice moved to Trash (soft deletion)
  const checkInvoice = await invoicesCol.findOne({ _id: testInvId });
  if (!checkInvoice) throw new Error('FAIL: Invoice was permanently destroyed! Must be soft-deleted.');
  if (checkInvoice.status !== 'trash') throw new Error(`FAIL: Invoice status is "${checkInvoice.status}", expected "trash".`);
  if (!checkInvoice.deletedAt) throw new Error('FAIL: Invoice deletedAt timestamp missing!');
  console.log('✓ PASS: Associated invoice was moved to Deleted / Trash section (soft deletion)');

  // Verify counter was not decreased
  const counterAfter = await countersCol.findOne({ _id: '2026-11' });
  if (counterAfter.highestSerial < counterBefore.highestSerial) {
    throw new Error('FAIL: Counter was decreased! Sequence must remain monotonic.');
  }
  console.log(`✓ PASS: Monotonic counter preserved (highestSerial: ${counterAfter.highestSerial})`);

  // Clean up test invoice and dummy GridFS file
  await invoicesCol.deleteOne({ _id: testInvId });
  await bucket.delete(gridFsFileId);
  console.log('[CLEANUP] Test records cleaned up.');

  console.log('\n================================================================');
  console.log('ALL REMOVE RECEIPTS FROM IMPORT HISTORY CHECKS PASSED!');
  console.log('================================================================');
  process.exit(0);
}

runRemoveReceiptTest().catch(err => {
  console.error('\nTest failed:', err);
  process.exit(1);
});
