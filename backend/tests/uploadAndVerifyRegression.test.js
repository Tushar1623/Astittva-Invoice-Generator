/**
 * Regression Test: Upload and Verify Receipt Flow
 * Verifies that receipt uploads and verification never throw "insertRes is not defined"
 * or any reference errors, for both brand new invoices and existing/updated invoices.
 */

const { 
  connectToDatabase, 
  getImportsCollection, 
  getInvoicesCollection, 
  getCountersCollection,
  getGridFSBucket,
  ObjectId
} = require('../src/config/db');
const { verifyImport } = require('../src/controllers/importController');

async function runTest() {
  console.log('--- Starting Upload & Verify Regression Test ---');
  await connectToDatabase();

  const imports = getImportsCollection();
  const invoices = getInvoicesCollection();

  // Test receipt data
  const testHash = 'test-sha256-hash-' + Date.now();
  const testInvoiceNumber = 'Test Client 999/12/99';

  // 1. Create a mock import document
  const importDoc = {
    originalFilename: 'Test_Receipt_Regression.pdf',
    fileHash: testHash,
    gridFsFileId: new ObjectId(),
    mimeType: 'application/pdf',
    fileSize: 1024,
    extractedText: 'Test receipt extraction text',
    extractedData: {
      invoiceNumber: testInvoiceNumber,
      customerName: 'NK Realtors Private Limited',
      clientName: 'Test Client',
      projectName: 'Test Project',
      flatNumber: 'Unit 999',
      invoiceDate: '2099-12-25',
      taxableAmount: 100000
    },
    status: 'pending_verification',
    warning: null,
    verifiedInvoiceId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const insertImportRes = await imports.insertOne(importDoc);
  const testImportId = insertImportRes.insertedId;
  console.log('✓ Created test import doc:', testImportId.toString());

  // 2. Test verifyImport for a NEW invoice (non-existing)
  console.log('Testing verifyImport for NEW invoice...');
  let resStatus = null;
  let resJson = null;

  const mockReq1 = {
    params: { id: testImportId.toString() },
    body: {
      invoiceNumber: testInvoiceNumber,
      clientName: 'Test Client',
      customerName: 'NK Realtors Private Limited',
      taxableAmount: 100000,
      invoiceDate: '2099-12-25'
    },
    user: { email: 'admin@astitva.com', name: 'Admin' }
  };

  const mockRes1 = {
    status: (code) => { resStatus = code; return mockRes1; },
    json: (data) => { resJson = data; return mockRes1; }
  };

  await verifyImport(mockReq1, mockRes1);

  if (resJson && resJson.success) {
    console.log('✓ New invoice verification succeeded without error:', resJson.message);
  } else {
    throw new Error(`New invoice verification failed: ${resJson?.error || JSON.stringify(resJson)}`);
  }

  // 3. Test verifyImport when invoice ALREADY EXISTS (this was the branch that caused "insertRes is not defined")
  console.log('Testing verifyImport for EXISTING invoice (branch: if (existingInv))...');
  resStatus = null;
  resJson = null;

  const mockReq2 = {
    params: { id: testImportId.toString() },
    body: {
      invoiceNumber: testInvoiceNumber,
      clientName: 'Test Client Updated',
      customerName: 'NK Realtors Private Limited',
      taxableAmount: 120000,
      invoiceDate: '2099-12-25',
      overrideDuplicate: true
    },
    user: { email: 'admin@astitva.com', name: 'Admin' }
  };

  const mockRes2 = {
    status: (code) => { resStatus = code; return mockRes2; },
    json: (data) => { resJson = data; return mockRes2; }
  };

  await verifyImport(mockReq2, mockRes2);

  if (resJson && resJson.success) {
    console.log('✓ Existing invoice verification succeeded with NO reference error:', resJson.message);
  } else {
    throw new Error(`Existing invoice verification failed: ${resJson?.error || JSON.stringify(resJson)}`);
  }

  // 4. Clean up test records
  console.log('Cleaning up test records...');
  await invoices.deleteOne({ invoiceNumber: testInvoiceNumber });
  await imports.deleteOne({ _id: testImportId });
  const counters = getCountersCollection();
  await counters.deleteOne({ _id: '2099-12' });
  console.log('✓ Test cleanup complete.');

  console.log('=== All Upload & Verify Regression Tests PASSED ===');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
