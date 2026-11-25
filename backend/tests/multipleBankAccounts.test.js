/**
 * ASTITTVA MARKETING - Multiple Bank Accounts Test Suite
 * Validates all 10 requirements from PRD Section 9.
 */

const assert = require('assert');
const { connectToDatabase, getInvoicesCollection } = require('../src/config/db');
const { createInvoice, updateInvoice, getInvoiceById, getInvoices } = require('../src/controllers/invoiceController');
const { getSettings } = require('../src/controllers/settingsController');
const { CONFIGURED_BANK_ACCOUNTS, getBankAccountById, validateBankAccount } = require('../src/config/bankAccounts');

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

async function runBankAccountsTests() {
  console.log('================================================================');
  console.log('     ASTITTVA MARKETING - MULTIPLE BANK ACCOUNTS TEST SUITE     ');
  console.log('================================================================\n');

  await connectToDatabase();

  // CHECK 1: Configured Bank Accounts list
  console.log('--- CHECK 1 & 2: Configured Bank Accounts Availability ---');
  assert(CONFIGURED_BANK_ACCOUNTS.length >= 2, 'At least 2 bank accounts must be configured');
  const acc1 = CONFIGURED_BANK_ACCOUNTS.find(a => a.id === 'account_1');
  const acc2 = CONFIGURED_BANK_ACCOUNTS.find(a => a.id === 'account_2');

  assert(acc1, 'Account 1 must exist');
  assert(acc1.isDefault === true, 'Account 1 must be marked as default');
  assert(acc1.bankName === 'AU Small Finance Bank', 'Account 1 must be AU Small Finance Bank');
  assert(acc1.accountNumber === '2602262416089178', 'Account 1 account number must match');
  assert(acc1.ifsc === 'AUBL0002624', 'Account 1 IFSC must match');
  console.log('✓ PASS: Account 1 (AU Small Finance Bank) is configured and default');

  assert(acc2, 'Account 2 must exist');
  assert(acc2.bankName === 'ICICI Bank Limited', 'Account 2 bank name must be ICICI Bank Limited');
  assert(acc2.accountHolder === 'ASTITTVA MARKETING PRIVATE LIMITED', 'Account 2 holder must be ASTITTVA MARKETING PRIVATE LIMITED');
  assert(acc2.accountNumber === '458805000106', 'Account 2 number must be 458805000106');
  assert(acc2.ifsc === 'ICIC0004588', 'Account 2 IFSC must be ICIC0004588');
  console.log('✓ PASS: Account 2 (ICICI Bank Limited) is configured with correct credentials');

  // CHECK 3: Settings API returns both bank accounts
  console.log('\n--- CHECK 3: Settings API Integration ---');
  const settingsReq = {};
  const settingsRes = mockRes();
  await getSettings(settingsReq, settingsRes);
  assert(settingsRes.body.success === true, 'Settings endpoint must succeed');
  assert(Array.isArray(settingsRes.body.settings.bankAccounts), 'settings.bankAccounts must be an array');
  assert(settingsRes.body.settings.bankAccounts.length >= 2, 'settings.bankAccounts must have at least 2 accounts');
  assert(settingsRes.body.settings.bankAccounts[0].id === 'account_1', 'First account in settings is account_1');
  assert(settingsRes.body.settings.bankAccounts[1].id === 'account_2', 'Second account in settings is account_2');
  console.log('✓ PASS: Settings API exposes multiple bank accounts');

  // CHECK 4: Invoice creation with default bank account (no explicit bank selected)
  console.log('\n--- CHECK 4: Invoice Creation with Default Bank Account (Account 1) ---');
  const testDate = '2025-05-15';
  const defaultInvReq = {
    body: {
      clientName: 'Bank Test Client A',
      invoiceDate: testDate,
      customerName: 'NK Realtors Private Limited',
      billingAddress: 'Kolkata, WB',
      projectName: 'Test Project',
      flatNumber: 'A101',
      cvAmount: 1000000,
      brokeragePercentage: 2,
      pricePerUnit: 20000,
      quantity: 1,
      allocateNewNumber: true
    }
  };
  const defaultInvRes = mockRes();
  await createInvoice(defaultInvReq, defaultInvRes);
  assert(defaultInvRes.statusCode === 201, 'Invoice creation must return 201');
  const createdInv1 = defaultInvRes.body.invoice;
  assert(createdInv1.selectedBankAccountId === 'account_1', 'Default bank account ID must be account_1');
  assert(createdInv1.bankDetails.bankName === 'AU Small Finance Bank', 'Default bank name must be AU Small Finance Bank');
  assert(createdInv1.bankDetails.accountNumber === '2602262416089178', 'Default account number must match');
  console.log(`✓ PASS: Invoice ${createdInv1.invoiceNumber} created with default AU Small Finance Bank details`);

  // CHECK 5: Invoice creation with ICICI Bank (Account 2)
  console.log('\n--- CHECK 5: Invoice Creation with ICICI Bank (Account 2) ---');
  const iciciInvReq = {
    body: {
      clientName: 'Bank Test Client B',
      invoiceDate: testDate,
      customerName: 'NK Realtors Private Limited',
      billingAddress: 'Kolkata, WB',
      projectName: 'Test Project',
      flatNumber: 'B202',
      cvAmount: 2000000,
      brokeragePercentage: 2,
      pricePerUnit: 40000,
      quantity: 1,
      allocateNewNumber: true,
      selectedBankAccountId: 'account_2' // Explicit ICICI selection
    }
  };
  const iciciInvRes = mockRes();
  await createInvoice(iciciInvReq, iciciInvRes);
  assert(iciciInvRes.statusCode === 201, 'ICICI invoice creation must return 201');
  const createdInv2 = iciciInvRes.body.invoice;
  assert(createdInv2.selectedBankAccountId === 'account_2', 'Bank account ID must be account_2');
  assert(createdInv2.bankDetails.bankName === 'ICICI Bank Limited', 'Bank name must be ICICI Bank Limited');
  assert(createdInv2.bankDetails.accountHolder === 'ASTITTVA MARKETING PRIVATE LIMITED', 'Account holder must be ASTITTVA MARKETING PRIVATE LIMITED');
  assert(createdInv2.bankDetails.accountNumber === '458805000106', 'Account number must be 458805000106');
  assert(createdInv2.bankDetails.ifsc === 'ICIC0004588', 'IFSC code must be ICIC0004588');
  console.log(`✓ PASS: Invoice ${createdInv2.invoiceNumber} created with ICICI Bank snapshot permanently stored`);

  // CHECK 6: Invoice Retrieval preserves selected bank details
  console.log('\n--- CHECK 6: Invoice Retrieval & Snapshot Persistence ---');
  const getReq = { params: { id: String(createdInv2._id) } };
  const getRes = mockRes();
  await getInvoiceById(getReq, getRes);
  assert(getRes.body.success === true, 'getInvoiceById must succeed');
  assert(getRes.body.invoice.bankDetails.bankName === 'ICICI Bank Limited', 'Retrieved invoice must retain ICICI Bank');
  assert(getRes.body.invoice.bankDetails.accountNumber === '458805000106', 'Retrieved invoice must retain 458805000106');
  console.log('✓ PASS: Bank details snapshot persists accurately on database retrieval');

  // CHECK 7: Editing unrelated invoice fields does NOT alter bank details
  console.log('\n--- CHECK 7: Accidental Overwrite Protection (Rule 3) ---');
  const editUnrelatedReq = {
    params: { id: String(createdInv2._id) },
    body: {
      itemDescription: 'Updated consultancy description without bank modification'
    }
  };
  const editUnrelatedRes = mockRes();
  await updateInvoice(editUnrelatedReq, editUnrelatedRes);
  assert(editUnrelatedRes.body.success === true, 'updateInvoice must succeed');
  assert(editUnrelatedRes.body.invoice.bankDetails.bankName === 'ICICI Bank Limited', 'Bank must remain ICICI Bank after editing unrelated field');
  assert(editUnrelatedRes.body.invoice.bankDetails.accountNumber === '458805000106', 'Account number must remain unchanged');
  console.log('✓ PASS: Editing unrelated invoice fields preserved bank details snapshot untouched');

  // CHECK 8: Changing bank account on an existing invoice
  console.log('\n--- CHECK 8: Explicit Bank Account Modification on Edit ---');
  const switchBankReq = {
    params: { id: String(createdInv2._id) },
    body: {
      selectedBankAccountId: 'account_1' // Switch to AU Small Finance Bank
    }
  };
  const switchBankRes = mockRes();
  await updateInvoice(switchBankReq, switchBankRes);
  assert(switchBankRes.body.success === true, 'updateInvoice must succeed');
  assert(switchBankRes.body.invoice.selectedBankAccountId === 'account_1', 'Account must be switched to account_1');
  assert(switchBankRes.body.invoice.bankDetails.bankName === 'AU Small Finance Bank', 'Bank name must now be AU Small Finance Bank');
  console.log('✓ PASS: Explicit bank account change correctly updated the invoice snapshot');

  // CHECK 9: Rejection of Invalid or Unconfigured Bank Account
  console.log('\n--- CHECK 9: Validation & Rejection of Invalid Bank Account ---');
  const invalidInvReq = {
    body: {
      clientName: 'Invalid Bank Test',
      invoiceDate: testDate,
      selectedBankAccountId: 'non_existent_bank_account_999'
    }
  };
  const invalidInvRes = mockRes();
  await createInvoice(invalidInvReq, invalidInvRes);
  assert(invalidInvRes.statusCode === 400, 'Invalid bank account must return HTTP 400 Bad Request');
  assert(invalidInvRes.body.success === false, 'Invalid bank account response must indicate failure');
  assert(invalidInvRes.body.error.includes('Invalid bank account selected'), 'Error message must specify invalid bank account');
  console.log(`✓ PASS: Invalid bank account selection was rejected with HTTP 400: "${invalidInvRes.body.error}"`);

  // CHECK 10: Historical Invoice Fallback (No stored bankDetails)
  console.log('\n--- CHECK 10: Historical Invoices Fallback Compatibility ---');
  const col = getInvoicesCollection();
  // Insert a mock legacy invoice without bankDetails
  const legacyInsert = await col.insertOne({
    invoiceNumber: '001/10/26',
    serialNumber: 1,
    month: 10,
    year: 2026,
    invoiceDate: '2026-10-01',
    customerName: 'NK Realtors Private Limited',
    clientName: 'Legacy Test Client',
    pricePerUnit: 50000,
    quantity: 1,
    financials: { taxableAmount: 50000, cgstRate: 9, cgstAmount: 4500, sgstRate: 9, sgstAmount: 4500, subtotal: 59000, roundOff: 0, finalTotal: 59000 },
    status: 'active',
    createdAt: new Date('2026-10-01')
  });

  const getLegacyReq = { params: { id: String(legacyInsert.insertedId) } };
  const getLegacyRes = mockRes();
  await getInvoiceById(getLegacyReq, getLegacyRes);
  assert(getLegacyRes.body.invoice.bankDetails, 'Legacy invoice must receive fallback bankDetails');
  assert(getLegacyRes.body.invoice.bankDetails.bankName === 'AU Small Finance Bank', 'Legacy fallback bank must be AU Small Finance Bank');
  assert(getLegacyRes.body.invoice.bankDetails.accountNumber === '2602262416089178', 'Legacy fallback account number must match');
  console.log('✓ PASS: Legacy invoice without saved bank details correctly received fallback to Account 1');

  // Clean up test invoices and counters
  await col.deleteMany({ _id: { $in: [createdInv1._id, createdInv2._id, legacyInsert.insertedId] } });
  const { getDb } = require('../src/config/db');
  await getDb().collection('counters').deleteOne({ _id: '2025-05' });
  await getDb().collection('counters').updateOne(
    { _id: '2026-11' },
    { $set: { highestSerial: 8, usedSerials: [6, 7, 8], updatedAt: new Date() } }
  );
  console.log('✓ Cleanup completed.');

  console.log('\n================================================================');
  console.log(' ALL 10 MULTIPLE BANK ACCOUNTS CHECKS PASSED SUCCESSFULLY!       ');
  console.log('================================================================\n');
  process.exit(0);
}

runBankAccountsTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
