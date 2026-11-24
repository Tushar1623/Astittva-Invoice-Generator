const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { 
  connectToDatabase, 
  getInvoicesCollection, 
  getCountersCollection, 
  getClientsCollection 
} = require('../src/config/db');
const { calculateFinancials } = require('../src/services/calculationService');
const { registerImportedSerial, peekNextNumber } = require('../src/services/counterService');
const { logAuditAction } = require('../src/services/auditService');

const historicalInvoices = [
  {
    serial: 6,
    month: 11,
    year: 2026,
    clientName: 'Goutam Bhattacherya',
    invoiceNumber: '006/11/26',
    formattedInvoiceNumber: 'Goutam Bhattacherya 006/11/2026',
    invoiceDate: '2026-11-06',
    customerName: 'NK Realtors Private Limited',
    customerGstin: '19AABCN7336G1ZC',
    customerState: '19 – West Bengal',
    placeOfSupply: '19 – West Bengal',
    billingAddress: 'DN-52, PS Srijan Tech Park, Salt Lake, Sector V, Kolkata:-700091, West Bengal',
    projectName: 'ASTHA',
    flatNumber: 'Tower 1, Unit 402',
    cvAmount: 5172400,
    brokeragePercentage: 2,
    pricePerUnit: 103448,
    hsnSac: '1164',
    quantity: 1,
    itemDescription: 'Brokerage @ 2% on Tower 1, Unit 402 at ASTHA by Goutam Bhattacherya of ₹ 51,72,400'
  },
  {
    serial: 7,
    month: 11,
    year: 2026,
    clientName: 'Somdatta Roy',
    invoiceNumber: '007/11/26',
    formattedInvoiceNumber: 'Somdatta Roy 007/11/2026',
    invoiceDate: '2026-11-06',
    customerName: 'NK Realtors Private Limited',
    customerGstin: '19AABCN7336G1ZC',
    customerState: '19 – West Bengal',
    placeOfSupply: '19 – West Bengal',
    billingAddress: 'DN-52, PS Srijan Tech Park, Salt Lake, Sector V, Kolkata:-700091, West Bengal',
    projectName: 'Vayu',
    flatNumber: 'Tower B, Unit B14',
    cvAmount: 5172400,
    brokeragePercentage: 2,
    pricePerUnit: 103448,
    hsnSac: '1164',
    quantity: 1,
    itemDescription: 'Brokerage @ 2% on Tower B, Unit B14 at Vayu by Somdatta Roy of ₹ 51,72,400'
  },
  {
    serial: 8,
    month: 11,
    year: 2026,
    clientName: 'Aparajita Das',
    invoiceNumber: '008/11/26',
    formattedInvoiceNumber: 'Aparajita Das 008/11/2026',
    invoiceDate: '2026-11-06',
    customerName: 'NK Realtors Private Limited',
    customerGstin: '19AABCN7336G1ZC',
    customerState: '19 – West Bengal',
    placeOfSupply: '19 – West Bengal',
    billingAddress: 'DN-52, PS Srijan Tech Park, Salt Lake, Sector V, Kolkata:-700091, West Bengal',
    projectName: 'Vayu',
    flatNumber: 'Tower B, Unit B12',
    cvAmount: 5172400,
    brokeragePercentage: 2,
    pricePerUnit: 103448,
    hsnSac: '1164',
    quantity: 1,
    itemDescription: 'Brokerage @ 2% on Tower - B, Unit - B12, 2th Floor, 3BHK, SBU-1164 by Aparajita Das of ₹ 51,72,400'
  }
];

async function runMigration() {
  console.log('--- STARTING HISTORICAL INVOICE MIGRATION ---');
  await connectToDatabase();

  const invoices = getInvoicesCollection();
  const clients = getClientsCollection();
  const counters = getCountersCollection();

  for (const inv of historicalInvoices) {
    const financials = calculateFinancials({
      quantity: inv.quantity,
      pricePerUnit: inv.pricePerUnit,
      cgstRate: 9,
      sgstRate: 9
    });

    const doc = {
      invoiceNumber: inv.invoiceNumber,
      displayInvoiceNumber: inv.formattedInvoiceNumber,
      serialNumber: inv.serial,
      month: inv.month,
      year: inv.year,
      invoiceDate: inv.invoiceDate,
      placeOfSupply: inv.placeOfSupply,
      customerName: inv.customerName,
      customerGstin: inv.customerGstin,
      customerState: inv.customerState,
      billingAddress: inv.billingAddress,
      clientName: inv.clientName,
      projectName: inv.projectName,
      flatNumber: inv.flatNumber,
      cvAmount: inv.cvAmount,
      brokeragePercentage: inv.brokeragePercentage,
      itemDescription: inv.itemDescription,
      hsnSac: inv.hsnSac,
      quantity: inv.quantity,
      pricePerUnit: inv.pricePerUnit,
      financials,
      status: 'active',
      isHistoricalMigration: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Upsert by serialNumber, month, year
    const filter = {
      $or: [
        { invoiceNumber: inv.invoiceNumber },
        { serialNumber: inv.serial, month: inv.month, year: inv.year }
      ]
    };

    await invoices.updateOne(filter, { $set: doc }, { upsert: true });
    console.log(`✓ Migrated Invoice: ${inv.clientName} – ${inv.invoiceNumber}`);

    // Update client cache
    await clients.updateOne(
      { name: inv.clientName },
      { $set: { name: inv.clientName, lastSeenAt: new Date() } },
      { upsert: true }
    );

    // Register serial with atomic counter
    await registerImportedSerial(inv.serial, inv.month, inv.year);
  }

  // Explicitly ensure November 2026 counter highestSerial is 8 after historical migration
  await counters.updateOne(
    { _id: '2026-11' },
    { $set: { highestSerial: 8, usedSerials: [6, 7, 8], updatedAt: new Date() } }
  );

  // Verify next invoice number
  const nextNov2026 = await peekNextNumber('', 2026, 11);
  console.log('----------------------------------------------------');
  console.log('Migration Completed Successfully!');
  console.log(`Current highest November 2026 serial: 8`);
  console.log(`Next November 2026 Invoice Number will be: ${nextNov2026.invoiceNumber}`);

  const sampleClientNext = await peekNextNumber('Aparajita Das', 2026, 11);
  console.log(`Sample with client prefix: ${sampleClientNext.invoiceNumber}`);
  console.log('----------------------------------------------------');

  await logAuditAction({
    action: 'MIGRATION_EXECUTE',
    userId: 'migration-script',
    userName: 'Migration Script',
    details: {
      migratedCount: historicalInvoices.length,
      serials: [6, 7, 8],
      nextSerial: 9
    }
  });

  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
