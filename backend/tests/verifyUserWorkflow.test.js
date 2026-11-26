const assert = require('assert');
const { connectToDatabase, ObjectId } = require('../src/config/db');

async function runWorkflowTest() {
  console.log('============================================================');
  console.log(' VERIFYING USER WORKFLOW: EDIT, SAVE, RERA & PREVIEW DATA');
  console.log('============================================================\n');

  const { db } = await connectToDatabase();
  const invoices = db.collection('invoices');

  // 1. Verify RERA Number
  console.log('--- CHECK 1: RERA Number Verification ---');
  const settingsRes = await fetch('http://localhost:5000/api/settings');
  const settingsData = await settingsRes.json();
  assert.strictEqual(settingsRes.status, 200, 'Settings API returned 200');
  assert.strictEqual(settingsData.settings.rera, 'WBRERA/A/NOR/2026/001132', 'RERA must be WBRERA/A/NOR/2026/001132');
  console.log('✓ PASS: Official RERA number verified:', settingsData.settings.rera);

  // 2. Fetch existing invoices
  console.log('\n--- CHECK 2: Invoices Retrieval & Target Selection ---');
  const invListRes = await fetch('http://localhost:5000/api/invoices');
  const invListData = await invListRes.json();
  assert.strictEqual(invListRes.status, 200);
  assert(invListData.invoices.length >= 3, 'At least 3 invoices exist in MongoDB');
  
  const target = invListData.invoices.find(i => i.invoiceNumber === '008/11/26');
  assert(target, 'Target invoice 008/11/26 found');
  console.log('✓ PASS: Target invoice found with ID:', target._id, 'Invoice #:', target.invoiceNumber);

  // 3. Test Editing & Saving Invoice
  console.log('\n--- CHECK 3: Edit & Save Invoice via PUT /api/invoices/:id ---');
  const updatePayload = {
    ...target,
    flatNumber: 'Tower B, Unit B12-Edited',
    clientName: 'Aparajita Das Edited',
    cvAmount: 5500000,
    brokeragePercentage: 2,
    selectedBankAccountId: 'account_2', // switch to ICICI Bank
    invoiceDate: '2026-11-20'
  };

  const updateRes = await fetch(`http://localhost:5000/api/invoices/${target._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload)
  });
  const updateJson = await updateRes.json();
  assert.strictEqual(updateRes.status, 200, `Expected 200, got ${updateRes.status}: ${updateJson.error}`);
  assert.strictEqual(updateJson.success, true, 'Update must be successful');
  console.log('✓ PASS: Invoice updated successfully via API');

  // 4. Verify Database Persistence & No Duplicate Records
  console.log('\n--- CHECK 4: Verify Persistence in MongoDB Atlas ---');
  const updatedDoc = await invoices.findOne({ $or: [{ _id: new ObjectId(target._id) }, { _id: target._id }] });
  assert(updatedDoc, 'Updated invoice document must be found in MongoDB');
  assert.strictEqual(updatedDoc.flatNumber, 'Tower B, Unit B12-Edited');
  assert.strictEqual(updatedDoc.clientName, 'Aparajita Das Edited');
  assert.strictEqual(updatedDoc.bankDetails.bankName, 'ICICI Bank Limited');
  assert.strictEqual(updatedDoc.bankDetails.accountNumber, '458805000106');
  assert.strictEqual(updatedDoc.financials.pricePerUnit, 110000);
  assert.strictEqual(updatedDoc.financials.finalTotal, 129800);
  assert.strictEqual(updatedDoc.displayInvoiceNumber, 'Aparajita Das Edited 008/11/26');
  console.log('✓ PASS: All edited fields persisted accurately in MongoDB');

  const allCount = await invoices.countDocuments({ invoiceNumber: '008/11/26' });
  assert.strictEqual(allCount, 1, 'No duplicate invoice created for same invoiceNumber');
  console.log('✓ PASS: Uniqueness preserved, no duplicate invoice created');

  // 5. Revert back to original clean values
  console.log('\n--- CHECK 5: Revert to Original Clean State ---');
  const revertPayload = {
    ...target,
    flatNumber: 'Tower B, Unit B12',
    clientName: 'Aparajita Das',
    cvAmount: 5172400,
    brokeragePercentage: 2,
    selectedBankAccountId: 'account_1',
    invoiceDate: '2026-11-06'
  };

  const revertRes = await fetch(`http://localhost:5000/api/invoices/${target._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(revertPayload)
  });
  const revertJson = await revertRes.json();
  assert.strictEqual(revertRes.status, 200);
  console.log('✓ PASS: Restored target invoice cleanly to original values');

  console.log('\n============================================================');
  console.log(' ALL USER WORKFLOW VERIFICATION CHECKS PASSED (5/5)');
  console.log('============================================================\n');
  process.exit(0);
}

runWorkflowTest().catch(err => {
  console.error('❌ Workflow test failed:', err);
  process.exit(1);
});
