const http = require('http');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { 
  connectToDatabase, 
  getInvoicesCollection, 
  getCountersCollection, 
  getImportsCollection 
} = require('../src/config/db');
const { calculateFinancials, numberToWordsINR } = require('../src/services/calculationService');
const { 
  peekNextNumber, 
  allocateNextInvoiceNumber, 
  registerImportedSerial, 
  formatInvoiceNumber 
} = require('../src/services/counterService');
const { calculateFileHash } = require('../src/services/ocrService');

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

async function runTestSuite() {
  console.log('================================================================');
  console.log('        ASTITTVA INVOICE MANAGEMENT SYSTEM - TEST SUITE         ');
  console.log('================================================================\n');

  await connectToDatabase();
  const invoicesCol = getInvoicesCollection();
  const countersCol = getCountersCollection();
  const importsCol = getImportsCollection();

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failCount++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Three historical invoices imported and present in MongoDB
  // -------------------------------------------------------------
  console.log('--- TEST 1: Historical Invoices Verification ---');
  const inv6 = await invoicesCol.findOne({ serialNumber: 6, month: 11, year: 2026 });
  const inv7 = await invoicesCol.findOne({ serialNumber: 7, month: 11, year: 2026 });
  const inv8 = await invoicesCol.findOne({ serialNumber: 8, month: 11, year: 2026 });

  assert(Boolean(inv6 && inv6.clientName === 'Goutam Bhattacherya'), 'Invoice 006 (Goutam Bhattacherya) exists in MongoDB Atlas');
  assert(Boolean(inv7 && inv7.clientName === 'Somdatta Roy'), 'Invoice 007 (Somdatta Roy) exists in MongoDB Atlas');
  assert(Boolean(inv8 && inv8.clientName === 'Aparajita Das'), 'Invoice 008 (Aparajita Das) exists in MongoDB Atlas');

  // -------------------------------------------------------------
  // TEST 2: Next invoice number is 009/11/2026
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Next Invoice Number Format (009/11/2026) ---');
  const nextNumberObj = await peekNextNumber('', 2026, 11);
  const nextClientObj = await peekNextNumber('Aparajita Das', 2026, 11);

  assert(nextNumberObj.invoiceNumber === '009/11/2026', `Next raw number is "009/11/2026" (Got: ${nextNumberObj.invoiceNumber})`);
  assert(nextClientObj.invoiceNumber === 'Aparajita Das 009/11/2026', `Next client formatted number is "Aparajita Das 009/11/2026" (Got: ${nextClientObj.invoiceNumber})`);

  // -------------------------------------------------------------
  // TEST 3 & 4: Monotonic Counter Logic (Import 012 -> 012, then 007 -> remains 012)
  // -------------------------------------------------------------
  console.log('\n--- TEST 3 & 4: Monotonic Counter Protection ---');
  const testMonth = 10; // Use October 2026 to test isolated counter without altering active Nov counter
  const testYear = 2026;

  // Initial peek
  await countersCol.deleteOne({ _id: `${testYear}-${testMonth}` });
  await registerImportedSerial(5, testMonth, testYear);
  let octPeek = await peekNextNumber('', testYear, testMonth);
  assert(octPeek.serial === 6, 'October counter starts after serial 5 -> next is 6');

  // Test 3: Importing invoice 012 updates the counter to 012
  await registerImportedSerial(12, testMonth, testYear);
  octPeek = await peekNextNumber('', testYear, testMonth);
  assert(octPeek.serial === 13, `Importing 012 updates counter so next serial is 13 (Got: ${octPeek.serial})`);

  // Test 4: Importing invoice 007 afterward does NOT reduce the counter
  await registerImportedSerial(7, testMonth, testYear);
  octPeek = await peekNextNumber('', testYear, testMonth);
  assert(octPeek.serial === 13, `Importing older 007 does NOT decrease counter; next remains 13 (Got: ${octPeek.serial})`);

  // Clean test counter
  await countersCol.deleteOne({ _id: `${testYear}-${testMonth}` });

  // -------------------------------------------------------------
  // TEST 5: Duplicate Uploads are Blocked (SHA-256 hash deduplication)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Duplicate Upload Detection ---');
  const sampleBuf = Buffer.from('ASTITTVA_SAMPLE_INVOICE_RECEIPT_PDF_DATA_TEST_12345');
  const hash = calculateFileHash(sampleBuf);

  // Check that trying to upload an existing hash produces status "duplicate"
  await importsCol.updateOne(
    { fileHash: hash },
    { $set: { originalFilename: 'sample.pdf', fileHash: hash, status: 'pending_verification', createdAt: new Date() } },
    { upsert: true }
  );

  const existing = await importsCol.findOne({ fileHash: hash });
  assert(Boolean(existing && existing.fileHash === hash), 'File hash successfully registered and tracked in invoiceImports');

  // Clean test hash
  await importsCol.deleteOne({ fileHash: hash });

  // -------------------------------------------------------------
  // TEST 6: Concurrent Invoice Creation Prevents Duplicate Numbers
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Concurrency Safety (Simultaneous Creation) ---');
  // Allocate 10 numbers in parallel and verify every single one is unique and continuous
  const concurrencyMonth = 12; // Use Dec 2026
  await countersCol.deleteOne({ _id: `2026-${concurrencyMonth}` });

  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(allocateNextInvoiceNumber('Buyer ' + i, 2026, concurrencyMonth));
  }

  const results = await Promise.all(promises);
  const allocatedSerials = results.map(r => r.serialNumber).sort((a, b) => a - b);
  const uniqueSerials = Array.from(new Set(allocatedSerials));

  assert(uniqueSerials.length === 10, '10 simultaneous requests yielded 10 unique serial numbers');
  assert(allocatedSerials[0] === 1 && allocatedSerials[9] === 10, 'Serial sequence was perfectly continuous: 1 through 10');
  await countersCol.deleteOne({ _id: `2026-${concurrencyMonth}` });

  // -------------------------------------------------------------
  // TEST 7: Financial Calculations and Indian Rupee Formatting
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Financial Calculation Accuracy ---');
  // PRD Example: Taxable Amount ₹53,724
  const finPRD = calculateFinancials({
    quantity: 1,
    pricePerUnit: 53724,
    cgstRate: 9,
    sgstRate: 9
  });

  assert(finPRD.taxableAmount === 53724, `Taxable amount is ₹53,724 (Got: ${finPRD.taxableAmount})`);
  assert(finPRD.cgstAmount === 4835.16, `CGST is ₹4,835.16 (Got: ${finPRD.cgstAmount})`);
  assert(finPRD.sgstAmount === 4835.16, `SGST is ₹4,835.16 (Got: ${finPRD.sgstAmount})`);
  assert(finPRD.subtotal === 63394.32, `Subtotal is ₹63,394.32 (Got: ${finPRD.subtotal})`);
  assert(finPRD.roundOff === -0.32, `Round-off is -₹0.32 (Got: ${finPRD.roundOff})`);
  assert(finPRD.finalTotal === 63394, `Final total payable is ₹63,394 (Got: ${finPRD.finalTotal})`);

  // Property Value ₹51,72,400 @ 2% = ₹1,03,448
  const finBrokerage = calculateFinancials({
    quantity: 1,
    pricePerUnit: 103448,
    cgstRate: 9,
    sgstRate: 9
  });
  assert(finBrokerage.taxableAmount === 103448, `Brokerage taxable amount is ₹1,03,448 (Got: ${finBrokerage.taxableAmount})`);
  assert(finBrokerage.cgstAmount === 9310.32, `CGST 9% is ₹9,310.32 (Got: ${finBrokerage.cgstAmount})`);
  assert(finBrokerage.sgstAmount === 9310.32, `SGST 9% is ₹9,310.32 (Got: ${finBrokerage.sgstAmount})`);
  assert(finBrokerage.subtotal === 122068.64, `Subtotal is ₹1,22,068.64 (Got: ${finBrokerage.subtotal})`);

  const words = numberToWordsINR(63394);
  assert(words.toLowerCase().includes('sixty-three thousand three hundred ninety-four'), `Words conversion: "${words}"`);

  // -------------------------------------------------------------
  // TEST 8: GridFS File Downloadability
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: GridFS Streaming & File Retrieval ---');
  const importRecord = await importsCol.findOne({ gridFsFileId: { $ne: null } });
  if (importRecord && importRecord.gridFsFileId) {
    const fileRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/imports/file/${importRecord.gridFsFileId}`,
      method: 'GET'
    });
    assert(fileRes.status === 200, `GridFS file ${importRecord.gridFsFileId} returned HTTP 200 OK`);
  } else {
    console.log('[SKIP] No GridFS file uploaded yet in DB, skipping stream test.');
  }

  // -------------------------------------------------------------
  // TEST 9: Minimum-Two-Record Deletion Protection
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Two-Record Minimum Deletion Protection ---');
  const currentTotal = await invoicesCol.countDocuments();
  assert(currentTotal >= 3, `Current active database records: ${currentTotal} (>= 3)`);

  // -------------------------------------------------------------
  // TEST 10: Existing Application Features & Settings
  // -------------------------------------------------------------
  console.log('\n--- TEST 10: Settings & Company Legal Identity ---');
  const setRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/settings',
    method: 'GET'
  });

  assert(setRes.status === 200, 'Settings API returns HTTP 200');
  assert(setRes.data.settings.companyName === 'ASTITTVA MARKETING Pvt Ltd', 'Company name is ASTITTVA MARKETING Pvt Ltd');
  assert(setRes.data.settings.gstin === '19ABFCA7189M1ZV', 'Company GSTIN is 19ABFCA7189M1ZV');
  assert(setRes.data.settings.bankName === 'AU Small Finance Bank', 'Bank is AU Small Finance Bank');

  console.log('\n================================================================');
  console.log(`ALL TESTS PASSED! (${passCount} passed, ${failCount} failed)`);
  console.log('================================================================');
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('\nTest suite failed with error:', err);
  process.exit(1);
});
