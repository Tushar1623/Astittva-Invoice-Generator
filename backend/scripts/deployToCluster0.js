/**
 * ASTITTVA MARKETING - Cluster0 Deployment & Setup Script
 * Sets up schemas, indexes, company profile, bank settings, admin user,
 * counter, and historical invoices on the target MongoDB cluster.
 * 
 * Usage:
 *   node backend/scripts/deployToCluster0.js "<YOUR_PASSWORD_OR_FULL_URI>"
 */

const { MongoClient, GridFSBucket } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const targetDbName = 'astittva_invoice_db';

// Read target password or full URI from CLI argument or environment
const arg = process.argv[2];
let targetUri = process.env.MONGO_URL;

if (arg) {
  if (arg.startsWith('mongodb+srv://') || arg.startsWith('mongodb://')) {
    targetUri = arg;
  } else {
    // Arg is just the password
    const encPass = encodeURIComponent(arg);
    targetUri = `mongodb+srv://astittvamarketing_db_user:${encPass}@cluster0.2s6rrvs.mongodb.net/${targetDbName}?retryWrites=true&w=majority`;
  }
}

async function setupCluster() {
  console.log('================================================================');
  console.log(' ASTITTVA MARKETING - CLUSTER SETUP & INITIALIZATION');
  console.log(` Target Database: "${targetDbName}"`);
  console.log('================================================================\n');

  console.log('Connecting to MongoDB Atlas Cluster...');
  const client = new MongoClient(targetUri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000
  });

  await client.connect();
  console.log('✓ Successfully connected to MongoDB Atlas!');

  const db = client.db(targetDbName);

  // 1. Initialize Collections & Indexes
  console.log('\n[1/5] Creating Database Collections & Indexes...');
  const collections = ['invoices', 'clients', 'counters', 'invoiceImports', 'companySettings', 'auditLogs', 'users', 'fs.files', 'fs.chunks'];
  for (const c of collections) {
    try {
      await db.createCollection(c);
      console.log(`  + Collection "${c}" ready.`);
    } catch (e) {
      // already exists
    }
  }

  await db.collection('invoices').createIndex({ invoiceNumber: 1 }, { unique: true, sparse: true });
  await db.collection('invoices').createIndex({ year: 1, month: 1, serialNumber: 1 });
  await db.collection('invoices').createIndex({ status: 1 });
  await db.collection('invoices').createIndex({ clientName: 1 });
  await db.collection('counters').createIndex({ year: 1, month: 1 });
  await db.collection('invoiceImports').createIndex({ fileHash: 1 });
  await db.collection('invoiceImports').createIndex({ status: 1 });
  await db.collection('clients').createIndex({ name: 1 }, { unique: true });
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('fs.files').createIndex({ filename: 1, uploadDate: 1 });
  await db.collection('fs.chunks').createIndex({ files_id: 1, n: 1 }, { unique: true });
  console.log('✓ All database indexes created successfully.');

  // 2. Initialize Company Settings
  console.log('\n[2/5] Initializing Company Profile & Banking Settings...');
  const defaultSettings = {
    _id: 'default',
    companyName: 'ASTITTVA MARKETING',
    tagline: 'REAL ESTATE & MARKETING CONSULTANCY',
    address: 'Action Area II, Rajarhat, Newtown, Kolkata, West Bengal - 700135',
    phone: '+91 98300 00000',
    email: 'info@astitva.com',
    pan: 'ABCDE1234F',
    gstin: '19ABCDE1234F1Z5',
    sacCode: '998311',
    placeOfSupply: '19-West Bengal',
    bankDetails: {
      accountName: 'ASTITTVA MARKETING',
      accountNumber: '2121200100012345',
      ifscCode: 'AUBL0002121',
      bankName: 'AU Small Finance Bank',
      branch: 'Kolkata Main Branch'
    },
    defaultNotes: '1. Payment is due within 7 days from invoice date.\n2. Please mention invoice number during bank transfer.',
    updatedAt: new Date()
  };

  await db.collection('companySettings').updateOne(
    { _id: 'default' },
    { $set: defaultSettings },
    { upsert: true }
  );
  console.log('✓ Company profile and AU Small Finance Bank details configured.');

  // 3. Initialize Admin User
  console.log('\n[3/5] Initializing Administrator Account...');
  await db.collection('users').updateOne(
    { email: 'admin@astitva.com' },
    {
      $set: {
        name: 'ASTITTVA Admin',
        email: 'admin@astitva.com',
        role: 'admin',
        isActive: true,
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );
  console.log('✓ Admin account configured: admin@astitva.com (Role: admin)');

  // 4. Initialize Counter (2026-11)
  console.log('\n[4/5] Synchronizing Monthly Sequence Counter (2026-11)...');
  await db.collection('counters').updateOne(
    { _id: '2026-11' },
    {
      $set: {
        year: 2026,
        month: 11,
        highestSerial: 8,
        updatedAt: new Date()
      },
      $addToSet: {
        usedSerials: { $each: [6, 7, 8] }
      }
    },
    { upsert: true }
  );
  console.log('✓ Counter for 2026-11 initialized: highestSerial = 8, next invoice = 009/11/2026.');

  // 5. Seed Historical Invoices if not present
  console.log('\n[5/5] Ensuring Historical Invoices (006, 007, 008) are Present...');
  const historicalInvoices = [
    {
      invoiceNumber: '006/11/26',
      clientName: 'Goutam Bhattacherya',
      date: '2026-11-06',
      serialNumber: 6,
      month: 11,
      year: 2026,
      hsnSac: '1164',
      projectName: 'PS The Soul',
      unitNo: 'Tower 4 - Flat 802',
      financials: {
        taxableAmount: 125000,
        cgstRate: 9,
        cgstAmount: 11250,
        sgstRate: 9,
        sgstAmount: 11250,
        subTotal: 147500,
        roundOff: 0,
        finalTotal: 147500,
        amountInWords: 'One Lakh Forty Seven Thousand Five Hundred Only'
      },
      status: 'active',
      isImported: true,
      deletedAt: null,
      createdAt: new Date('2026-11-06T10:00:00Z'),
      updatedAt: new Date()
    },
    {
      invoiceNumber: '007/11/26',
      clientName: 'Somdatta Roy',
      date: '2026-11-07',
      serialNumber: 7,
      month: 11,
      year: 2026,
      hsnSac: '1164',
      projectName: 'Emami City',
      unitNo: 'Tower 2 - Flat 401',
      financials: {
        taxableAmount: 85000,
        cgstRate: 9,
        cgstAmount: 7650,
        sgstRate: 9,
        sgstAmount: 7650,
        subTotal: 100300,
        roundOff: 0,
        finalTotal: 100300,
        amountInWords: 'One Lakh Three Hundred Only'
      },
      status: 'active',
      isImported: true,
      deletedAt: null,
      createdAt: new Date('2026-11-07T10:00:00Z'),
      updatedAt: new Date()
    },
    {
      invoiceNumber: '008/11/26',
      clientName: 'Aparajita Das',
      date: '2026-11-08',
      serialNumber: 8,
      month: 11,
      year: 2026,
      hsnSac: '1164',
      projectName: 'Hiland Park',
      unitNo: 'Tower 1 - Flat 1204',
      financials: {
        taxableAmount: 150000,
        cgstRate: 9,
        cgstAmount: 13500,
        sgstRate: 9,
        sgstAmount: 13500,
        subTotal: 177000,
        roundOff: 0,
        finalTotal: 177000,
        amountInWords: 'One Lakh Seventy Seven Thousand Only'
      },
      status: 'active',
      isImported: true,
      deletedAt: null,
      createdAt: new Date('2026-11-08T10:00:00Z'),
      updatedAt: new Date()
    }
  ];

  for (const inv of historicalInvoices) {
    await db.collection('invoices').updateOne(
      { invoiceNumber: inv.invoiceNumber },
      { $set: inv },
      { upsert: true }
    );
    await db.collection('clients').updateOne(
      { name: inv.clientName },
      { $set: { name: inv.clientName, lastSeenAt: new Date() } },
      { upsert: true }
    );
    console.log(`  + Verified invoice ${inv.invoiceNumber} (${inv.clientName})`);
  }

  // Audit Log
  await db.collection('auditLogs').insertOne({
    action: 'SYSTEM_SETUP',
    entityType: 'database',
    entityId: targetDbName,
    userId: 'system',
    userName: 'Setup Script',
    details: { initializedAt: new Date() },
    timestamp: new Date()
  });

  const activeCount = await db.collection('invoices').countDocuments({ status: { $ne: 'trash' } });
  console.log('\n================================================================');
  console.log('🎉 SETUP & DESIGN COMPLETED SUCCESSFULLY!');
  console.log(` Database:       ${targetDbName}`);
  console.log(` Active Invoices: ${activeCount}`);
  console.log(` Next Sequence:   009/11/2026`);
  console.log('================================================================\n');

  await client.close();
}

setupCluster().catch(err => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});
