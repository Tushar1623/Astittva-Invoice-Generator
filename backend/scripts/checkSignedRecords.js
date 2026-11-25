const { connectToDatabase, getAuditLogsCollection, getInvoicesCollection } = require('../src/config/db');

async function main() {
  await connectToDatabase();
  const logs = getAuditLogsCollection();
  const allLogs = await logs.find({}).toArray();
  const signedLogs = allLogs.filter(l => Boolean(l.signature));
  console.log('Total audit logs in DB:', allLogs.length);
  console.log('Signed audit logs in DB:', signedLogs.length);
  if (signedLogs.length > 0) {
    console.log('First signed audit log:', {
      eventId: signedLogs[0].eventId,
      action: signedLogs[0].action,
      signature: signedLogs[0].signature,
      timestamp: signedLogs[0].timestamp
    });
  }

  const invoices = getInvoicesCollection();
  const allInvs = await invoices.find({}).toArray();
  const signedInvs = allInvs.filter(i => Boolean(i.signature));
  console.log('Total invoices in DB:', allInvs.length);
  console.log('Signed invoices in DB:', signedInvs.length);
  if (signedInvs.length > 0) {
    console.log('First signed invoice:', {
      invoiceNumber: signedInvs[0].invoiceNumber,
      integrityHash: signedInvs[0].integrityHash,
      signature: signedInvs[0].signature
    });
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
