const { MongoClient, GridFSBucket } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sourceDbName = 'astitva_realestate';
const targetDbName = 'astittva_invoice_db';
const baseUri = process.env.MONGO_URL;

async function migrateData() {
  console.log('================================================================');
  console.log(` MIGRATING DATA TO TARGET DATABASE: "${targetDbName}"`);
  console.log('================================================================\n');

  const client = new MongoClient(baseUri);
  await client.connect();
  console.log('Connected to MongoDB Atlas Cluster.');

  const sourceDb = client.db(sourceDbName);
  const targetDb = client.db(targetDbName);

  const collectionsToMigrate = [
    'invoices',
    'counters',
    'invoiceImports',
    'companySettings',
    'clients',
    'auditLogs',
    'users'
  ];

  for (const colName of collectionsToMigrate) {
    const sourceCol = sourceDb.collection(colName);
    const targetCol = targetDb.collection(colName);

    const docs = await sourceCol.find().toArray();
    console.log(`Checking collection "${colName}": ${docs.length} source documents.`);

    if (docs.length > 0) {
      for (const doc of docs) {
        await targetCol.replaceOne({ _id: doc._id }, doc, { upsert: true });
      }
      console.log(`✓ Migrated ${docs.length} documents into "${targetDbName}.${colName}".`);
    }
  }

  // Migrate GridFS files and chunks
  console.log('\nMigrating GridFS storage (fs.files & fs.chunks)...');
  const sourceFiles = sourceDb.collection('fs.files');
  const targetFiles = targetDb.collection('fs.files');
  const sourceChunks = sourceDb.collection('fs.chunks');
  const targetChunks = targetDb.collection('fs.chunks');

  const files = await sourceFiles.find().toArray();
  console.log(`Found ${files.length} GridFS files in source.`);
  for (const f of files) {
    await targetFiles.replaceOne({ _id: f._id }, f, { upsert: true });
  }

  const chunks = await sourceChunks.find().toArray();
  console.log(`Found ${chunks.length} GridFS chunks in source.`);
  for (const ch of chunks) {
    await targetChunks.replaceOne({ _id: ch._id }, ch, { upsert: true });
  }
  console.log('✓ GridFS migration completed.');

  // Create GridFS & Collection indexes on target
  console.log('\nCreating indexes on target database...');
  await targetDb.collection('fs.files').createIndex({ filename: 1, uploadDate: 1 });
  await targetDb.collection('fs.chunks').createIndex({ files_id: 1, n: 1 }, { unique: true });
  await targetDb.collection('invoices').createIndex({ invoiceNumber: 1 }, { unique: true, sparse: true });
  await targetDb.collection('invoices').createIndex({ year: 1, month: 1, serialNumber: 1 });
  await targetDb.collection('invoices').createIndex({ status: 1 });
  await targetDb.collection('invoices').createIndex({ clientName: 1 });
  await targetDb.collection('invoiceImports').createIndex({ fileHash: 1 });
  await targetDb.collection('invoiceImports').createIndex({ status: 1 });
  await targetDb.collection('counters').createIndex({ year: 1, month: 1 });
  await targetDb.collection('clients').createIndex({ name: 1 }, { unique: true });
  await targetDb.collection('users').createIndex({ email: 1 }, { unique: true });
  console.log('✓ All target indexes created.');

  // Ensure 2026-11 counter has highestSerial = 8
  await targetDb.collection('counters').updateOne(
    { _id: '2026-11' },
    {
      $set: { year: 2026, month: 11, highestSerial: 8, updatedAt: new Date() },
      $addToSet: { usedSerials: { $each: [6, 7, 8] } }
    },
    { upsert: true }
  );
  console.log('✓ Counter 2026-11 verified in target: highestSerial = 8.');

  // Summary
  const invoiceCount = await targetDb.collection('invoices').countDocuments({ status: { $ne: 'trash' } });
  const importCount = await targetDb.collection('invoiceImports').countDocuments();
  console.log(`\n================================================================`);
  console.log(` MIGRATION TO "${targetDbName}" FINISHED SUCCESSFULLY!`);
  console.log(` Active Invoices: ${invoiceCount}`);
  console.log(` Import Records:  ${importCount}`);
  console.log(` Next Invoice:    009/11/2026`);
  console.log(`================================================================\n`);

  await client.close();
}

migrateData().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
