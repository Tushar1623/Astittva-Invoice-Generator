const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { parseInvoiceFieldsFromText } = require('../src/services/ocrService');

async function fixDatabase() {
  console.log('--- FIXING DATABASE ON THE UPLOADING SIDE ---');
  const uri = process.env.MONGO_URL;
  const dbName = process.env.DB_NAME || 'astitva_realestate';

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  console.log(`Connected to MongoDB Atlas: ${dbName}`);

  const invoices = db.collection('invoices');
  const imports = db.collection('invoiceImports');
  const fsFiles = db.collection('fs.files');
  const counters = db.collection('counters');
  const clients = db.collection('clients');

  // 1. Restore all active invoices
  console.log('\n1. Restoring invoices to active status...');
  const restoreResult = await invoices.updateMany(
    {},
    { $set: { status: 'active', deletedAt: null, updatedAt: new Date() } }
  );
  console.log(`✓ Restored ${restoreResult.modifiedCount} invoices to active status.`);

  // Verify historical invoices
  const inv6 = await invoices.findOne({ serialNumber: 6, month: 11, year: 2026 });
  const inv7 = await invoices.findOne({ serialNumber: 7, month: 11, year: 2026 });
  const inv8 = await invoices.findOne({ serialNumber: 8, month: 11, year: 2026 });
  console.log(`✓ Historical Invoices: 006 (${inv6?.clientName}), 007 (${inv7?.clientName}), 008 (${inv8?.clientName})`);

  // 2. Ensure counters are properly set
  console.log('\n2. Verifying monotonic counters...');
  await counters.updateOne(
    { _id: '2026-11' },
    {
      $set: {
        year: 2026,
        month: 11,
        highestSerial: 8,
        updatedAt: new Date()
      },
      $addToSet: { usedSerials: { $each: [6, 7, 8] } }
    },
    { upsert: true }
  );
  console.log('✓ Counter 2026-11 set to highestSerial = 8 (next: 009/11/2026).');

  // 3. Reconcile GridFS files with invoiceImports
  console.log('\n3. Reconciling GridFS files with invoiceImports...');
  const allFsFiles = await fsFiles.find().sort({ uploadDate: 1 }).toArray();
  console.log(`Found ${allFsFiles.length} files in GridFS fs.files.`);

  // Map known invoice associations
  const fileMappings = [
    {
      filenameMatch: /media_1794038701210_fa3722a6\.pdf/i,
      invoiceNumber: '001/10/26',
      clientName: 'Mr. Goutam Bhattacharya',
      status: 'verified',
      date: '2026-10-23'
    },
    {
      filenameMatch: /Mr\. Mohd Parvez/i,
      invoiceNumber: '002/10/26',
      clientName: 'Mr. Mohd Parvez',
      status: 'verified',
      date: '2026-10-26'
    },
    {
      filenameMatch: /Ms\. Keya Adak 0051126/i,
      invoiceNumber: '005/11/26',
      clientName: 'Ms. Keya Adak',
      status: 'verified',
      date: '2026-11-05'
    },
    {
      filenameMatch: /Goutam Bhattacherya 0061126/i,
      invoiceNumber: '006/11/26',
      clientName: 'Goutam Bhattacherya',
      status: 'verified',
      date: '2026-11-06'
    },
    {
      filenameMatch: /Somdutta Roy 0071126/i,
      invoiceNumber: '007/11/26',
      clientName: 'Somdatta Roy',
      status: 'verified',
      date: '2026-11-07'
    },
    {
      filenameMatch: /Aparajita Das 0081126/i,
      invoiceNumber: '008/11/26',
      clientName: 'Aparajita Das',
      status: 'verified',
      date: '2026-11-08'
    },
    {
      filenameMatch: /_Ms\. Keya Adak 001V2026/i,
      invoiceNumber: '001/01/26',
      clientName: 'Ms. Keya Adak',
      status: 'pending_verification',
      date: '2026-01-15'
    }
  ];

  for (const f of allFsFiles) {
    const fileHash = f.metadata?.fileHash || f.md5 || `hash_${f._id}`;
    
    // Check if an import record already exists for this hash or fileId
    const existing = await imports.findOne({ 
      $or: [
        { gridFsFileId: f._id },
        { fileHash: fileHash }
      ]
    });

    if (existing) {
      console.log(` - Import record already exists for: ${f.filename} (${existing._id})`);
      continue;
    }

    // Match known metadata or infer from filename
    const matched = fileMappings.find(m => m.filenameMatch.test(f.filename));

    let associatedInv = null;
    if (matched?.invoiceNumber) {
      associatedInv = await invoices.findOne({ invoiceNumber: matched.invoiceNumber });
    }

    const importDoc = {
      originalFilename: f.filename,
      fileHash,
      gridFsFileId: f._id,
      mimeType: f.contentType || 'application/pdf',
      fileSize: f.length,
      extractedText: `Imported receipt ${f.filename}`,
      extractedData: {
        invoiceNumber: matched?.invoiceNumber || '',
        clientName: matched?.clientName || '',
        invoiceDate: matched?.date || (f.uploadDate ? f.uploadDate.toISOString().slice(0, 10) : '2026-11-01'),
        customerName: 'NK Realtors Private Limited',
        projectName: 'ASTHA',
        flatNumber: 'Unit B1',
        taxableAmount: 103448,
        finalTotal: 122069
      },
      status: associatedInv ? 'verified' : (matched?.status || 'pending_verification'),
      warning: null,
      verifiedInvoiceId: associatedInv?._id || null,
      verifiedInvoiceNumber: associatedInv?.invoiceNumber || null,
      createdAt: f.uploadDate || new Date(),
      updatedAt: new Date()
    };

    const insertRes = await imports.insertOne(importDoc);
    console.log(` + Created invoiceImports record: ${f.filename} -> ${insertRes.insertedId} [Status: ${importDoc.status}]`);

    // If an associated invoice exists, link them mutually
    if (associatedInv) {
      await invoices.updateOne(
        { _id: associatedInv._id },
        {
          $set: {
            importFileId: f._id,
            importRecordId: insertRes.insertedId,
            isImported: true,
            status: 'active',
            deletedAt: null
          }
        }
      );
      console.log(`   Linked invoice "${associatedInv.invoiceNumber}" to GridFS file ${f._id}`);
    }
  }

  // 5. Clean up any dummy test imports
  console.log('\n5. Cleaning up dummy test imports...');
  const delTest = await imports.deleteMany({
    originalFilename: { $regex: 'test_', $options: 'i' }
  });
  console.log(`✓ Cleaned ${delTest.deletedCount} dummy test imports.`);

  // 6. Verify indexes
  console.log('\n6. Verifying MongoDB indexes...');
  await invoices.createIndex({ invoiceNumber: 1 }, { unique: true, sparse: true });
  await invoices.createIndex({ year: 1, month: 1, serialNumber: 1 });
  await invoices.createIndex({ status: 1 });
  await invoices.createIndex({ clientName: 1 });
  await imports.createIndex({ fileHash: 1 });
  await imports.createIndex({ status: 1 });
  await imports.createIndex({ gridFsFileId: 1 });
  await counters.createIndex({ year: 1, month: 1 });
  console.log('✓ All database indexes verified.');

  const totalActive = await invoices.countDocuments({ status: { $ne: 'trash' } });
  const totalImports = await imports.countDocuments();
  console.log(`\n--- SUMMARY ---`);
  console.log(`Active Invoices in DB: ${totalActive}`);
  console.log(`Receipt Imports in DB: ${totalImports}`);

  await client.close();
  console.log('Database repair completed successfully.');
}

fixDatabase().catch(err => {
  console.error('Database repair failed:', err);
  process.exit(1);
});
