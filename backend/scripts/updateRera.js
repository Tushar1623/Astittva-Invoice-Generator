const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const uri = process.env.MONGO_URL;

(async () => {
  await mongoose.connect(uri);
  const client = mongoose.connection.client;
  
  for (const dbName of ['astittva_invoice_db', 'astitva_realestate']) {
    const db = client.db(dbName);
    const res = await db.collection('companySettings').updateMany(
      {},
      { $set: { rera: 'WBRERA/A/NOR/2026/001132' } }
    );
    console.log('Updated RERA in ' + dbName + ':', res.modifiedCount, 'documents.');
    
    // Also update companySnapshot.rera inside invoices if present
    const invRes = await db.collection('invoices').updateMany(
      { 'companySnapshot.rera': { $exists: true } },
      { $set: { 'companySnapshot.rera': 'WBRERA/A/NOR/2026/001132' } }
    );
    console.log('Updated invoice snapshot RERA in ' + dbName + ':', invRes.modifiedCount, 'invoices.');

    // Fetch and verify
    const sample = await db.collection('companySettings').findOne({});
    console.log('Verified companySettings RERA in ' + dbName + ':', sample?.rera);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
