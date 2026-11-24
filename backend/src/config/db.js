const { MongoClient, GridFSBucket } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'astitva_realestate';

let client = null;
let db = null;
let bucket = null;

async function connectToDatabase() {
  if (db && client) {
    return { client, db, bucket };
  }

  if (!uri) {
    throw new Error('MONGO_URL must be set in the backend environment.');
  }

  client = new MongoClient(uri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    retryWrites: true,
    writeConcern: { w: 'majority' }
  });

  await client.connect();
  db = client.db(dbName);
  bucket = new GridFSBucket(db, { bucketName: 'fs' });

  console.log(`[MongoDB] Connected successfully to Atlas database: "${dbName}"`);

  // Ensure collections and indexes exist
  await initializeIndexes();

  return { client, db, bucket };
}

async function initializeIndexes() {
  try {
    const invoices = db.collection('invoices');
    await invoices.createIndex({ invoiceNumber: 1 }, { unique: true, sparse: true });
    await invoices.createIndex({ year: 1, month: 1, serialNumber: 1 });
    await invoices.createIndex({ status: 1 });
    await invoices.createIndex({ clientName: 1 });

    const imports = db.collection('invoiceImports');
    await imports.createIndex({ fileHash: 1 });
    await imports.createIndex({ status: 1 });

    const counters = db.collection('counters');
    await counters.createIndex({ year: 1, month: 1 });

    console.log('[MongoDB] Collections and indexes initialized successfully.');
  } catch (err) {
    console.warn('[MongoDB] Index creation notice:', err.message);
  }
}

function getDb() {
  if (!db) throw new Error('Database not connected. Call connectToDatabase() first.');
  return db;
}

function getClient() {
  return client;
}

function getGridFSBucket() {
  if (!bucket) throw new Error('GridFS Bucket not initialized. Call connectToDatabase() first.');
  return bucket;
}

function getInvoicesCollection() {
  return getDb().collection('invoices');
}

function getClientsCollection() {
  return getDb().collection('clients');
}

function getCountersCollection() {
  return getDb().collection('counters');
}

function getImportsCollection() {
  return getDb().collection('invoiceImports');
}

function getCompanySettingsCollection() {
  return getDb().collection('companySettings');
}

function getAuditLogsCollection() {
  return getDb().collection('auditLogs');
}

function getUsersCollection() {
  return getDb().collection('users');
}

module.exports = {
  connectToDatabase,
  getDb,
  getClient,
  getGridFSBucket,
  getInvoicesCollection,
  getClientsCollection,
  getCountersCollection,
  getImportsCollection,
  getCompanySettingsCollection,
  getAuditLogsCollection,
  getUsersCollection
};
