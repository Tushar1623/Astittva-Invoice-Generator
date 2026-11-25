const assert = require('assert');
const { connectToDatabase, getInvoicesCollection } = require('../src/config/db');
const { getNextNumber, createInvoice } = require('../src/controllers/invoiceController');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function runSyncTests() {
  console.log('================================================================');
  console.log(' TEST: SYNCHRONIZE ANTICIPATED NUMBER AND INVOICE NUMBER       ');
  console.log('================================================================\n');

  await connectToDatabase();

  // CHECK 1: Peeking next number with Aparajita Das
  console.log('--- CHECK 1: Peek next number with Aparajita Das ---');
  const req1 = { query: { clientName: 'Aparajita Das', date: '2026-11-25' } };
  const res1 = mockRes();
  await getNextNumber(req1, res1);
  assert(res1.body.success === true, 'Peek must succeed');
  assert(res1.body.invoiceNumber === 'Aparajita Das 009/11/2026', `Expected "Aparajita Das 009/11/2026", got "${res1.body.invoiceNumber}"`);
  console.log(`✓ PASS: Anticipated Number is "${res1.body.invoiceNumber}"`);

  // CHECK 2: Peeking next number with Rahul Sharma (dynamic update)
  console.log('\n--- CHECK 2: Peek next number dynamically with Rahul Sharma ---');
  const req2 = { query: { clientName: 'Rahul Sharma', date: '2026-11-25' } };
  const res2 = mockRes();
  await getNextNumber(req2, res2);
  assert(res2.body.success === true, 'Peek must succeed');
  assert(res2.body.invoiceNumber === 'Rahul Sharma 009/11/2026', `Expected "Rahul Sharma 009/11/2026", got "${res2.body.invoiceNumber}"`);
  console.log(`✓ PASS: Dynamically updated to "${res2.body.invoiceNumber}"`);

  // CHECK 3: Peeking with changed invoice date (e.g. December 2026)
  console.log('\n--- CHECK 3: Date change recalculates sequence correctly ---');
  const req3 = { query: { clientName: 'Rahul Sharma', date: '2026-12-10' } };
  const res3 = mockRes();
  await getNextNumber(req3, res3);
  assert(res3.body.success === true, 'Peek must succeed');
  assert(res3.body.invoiceNumber === 'Rahul Sharma 001/12/2026', `Expected "Rahul Sharma 001/12/2026", got "${res3.body.invoiceNumber}"`);
  console.log(`✓ PASS: Sequence for December 2026 is "${res3.body.invoiceNumber}"`);

  // CHECK 4: Peeking did NOT consume or increment the counter
  console.log('\n--- CHECK 4: Non-consumption verification (peeks do not increment) ---');
  const req4 = { query: { clientName: 'Aparajita Das', date: '2026-11-25' } };
  const res4 = mockRes();
  await getNextNumber(req4, res4);
  assert(res4.body.invoiceNumber === 'Aparajita Das 009/11/2026', 'Counter must remain at 9');
  console.log('✓ PASS: November counter remains at 009 (unconsumed)');

  // CHECK 5: Customer name fallback if clientName not specified
  console.log('\n--- CHECK 5: Customer name fallback when clientName is blank ---');
  const req5 = { query: { customerName: 'Rahul Sharma', date: '2026-11-25' } };
  const res5 = mockRes();
  await getNextNumber(req5, res5);
  assert(res5.body.invoiceNumber === 'Rahul Sharma 009/11/2026', `Expected "Rahul Sharma 009/11/2026", got "${res5.body.invoiceNumber}"`);
  console.log(`✓ PASS: Customer name fallback generated "${res5.body.invoiceNumber}"`);

  console.log('\n================================================================');
  console.log(' ALL SYNCHRONIZATION CHECKS PASSED SUCCESSFULLY!                ');
  console.log('================================================================\n');
}

runSyncTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
