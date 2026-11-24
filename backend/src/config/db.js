const mongoose = require('mongoose');
const GridFSBucket = mongoose.mongo.GridFSBucket;
const ObjectId = mongoose.Types.ObjectId;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'astittva_invoice_db';

let bucket = null;

// Import all Mongoose models
const models = require('../models');

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1 && bucket) {
    return {
      client: mongoose.connection.getClient(),
      db: mongoose.connection.db,
      bucket,
      mongoose,
      ...models
    };
  }

  if (!uri) {
    throw new Error('MONGO_URL must be set in the backend environment.');
  }

  // Connect Mongoose to MongoDB Atlas
  await mongoose.connect(uri, {
    dbName,
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    retryWrites: true,
    writeConcern: { w: 'majority' }
  });

  const db = mongoose.connection.db;
  bucket = new GridFSBucket(db, { bucketName: 'fs' });

  console.log(`[MongoDB/Mongoose] Connected successfully to Atlas database: "${dbName}"`);

  // Initialize indexes via Mongoose schemas
  await initializeIndexes(db);

  return {
    client: mongoose.connection.getClient(),
    db,
    bucket,
    mongoose,
    ...models
  };
}

async function initializeIndexes(db) {
  try {
    // Ensure all Mongoose model indexes are registered
    await Promise.all([
      models.Invoice.init(),
      models.Counter.init(),
      models.InvoiceImport.init(),
      models.CompanySettings.init(),
      models.Client.init(),
      models.AuditLog.init(),
      models.User.init()
    ]);

    // GridFS indexes
    await db.collection('fs.files').createIndex({ filename: 1, uploadDate: 1 });
    await db.collection('fs.chunks').createIndex({ files_id: 1, n: 1 }, { unique: true });

    console.log('[MongoDB/Mongoose] Models, collections and indexes initialized successfully.');
  } catch (err) {
    console.warn('[MongoDB/Mongoose] Index initialization notice:', err.message);
  }
}

function getDb() {
  if (!mongoose.connection.db) throw new Error('Database not connected. Call connectToDatabase() first.');
  return mongoose.connection.db;
}

function getClient() {
  return mongoose.connection.getClient();
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
  getUsersCollection,
  mongoose,
  ObjectId,
  ...models
};
