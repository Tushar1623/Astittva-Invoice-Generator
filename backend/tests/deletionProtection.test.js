const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { connectToDatabase, getInvoicesCollection } = require('../src/config/db');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testDeletionProtection() {
  console.log('--- TESTING TWO-RECORD RETENTION DELETION PROTECTION ---');
  await connectToDatabase();
  const invoices = getInvoicesCollection();

  // Get current active invoices
  const listRes = await request({ hostname: 'localhost', port: 5000, path: '/api/invoices', method: 'GET' });
  console.log(`Current invoices count: ${listRes.data.count}`);

  // Create a temporary test invoice so we have > 2
  const tempRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/invoices',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    clientName: 'Temp Test Buyer',
    customerName: 'NK Realtors',
    pricePerUnit: 10000,
    invoiceDate: '2026-11-24'
  });

  const tempId = tempRes.data.invoice._id;
  console.log(`Created temporary test invoice: ${tempRes.data.invoice.invoiceNumber}`);

  // Total count is now >= 4
  const countBefore = await invoices.countDocuments();
  console.log(`Total count in database: ${countBefore}`);

  // Deleting temporary invoice is allowed because count > 2
  const delTemp = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/invoices/${tempId}`,
    method: 'DELETE'
  });
  console.log(`Delete temporary invoice status: ${delTemp.status} (${delTemp.data.message || delTemp.data.error})`);

  // Now verify what happens when count reaches 2
  // We have 3 historical invoices (006, 007, 008)
  const remainingInvoices = await invoices.find().toArray();
  console.log(`Remaining baseline records: ${remainingInvoices.length}`);

  // Delete one to bring count to exactly 2
  const invToDelete = remainingInvoices[0];
  const delAllowed = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/invoices/${invToDelete._id}`,
    method: 'DELETE'
  });
  console.log(`Delete 1 baseline record (count was 3): status ${delAllowed.status}`);

  // NOW EXACTLY 2 INVOICES REMAIN IN THE DATABASE!
  const exactlyTwoCount = await invoices.countDocuments();
  console.log(`Database count is now exactly: ${exactlyTwoCount}`);

  // Attempting to delete when only 2 remain MUST BE BLOCKED!
  const secondInv = remainingInvoices[1];
  const delBlocked = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/invoices/${secondInv._id}`,
    method: 'DELETE'
  });

  console.log(`Attempt delete with 2 records remaining: status ${delBlocked.status}`);
  console.log(`Block message: "${delBlocked.data.error}"`);

  if (delBlocked.status === 403 && delBlocked.data.error.includes('minimum of 2 retained invoice records')) {
    console.log('✓ PASS: Deletion protection successfully blocked deletion of retained invoices!');
  } else {
    throw new Error('FAIL: Deletion protection failed to block deletion.');
  }

  // Restore the deleted record so all 3 historical invoices (006, 007, 008) remain in the system
  delete invToDelete._id;
  await invoices.insertOne(invToDelete);
  console.log('✓ Restored baseline records. Active count back to 3.');

  process.exit(0);
}

testDeletionProtection().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
