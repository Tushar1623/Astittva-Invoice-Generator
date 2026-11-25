const { getCountersCollection, getInvoicesCollection } = require('../config/db');

/**
 * Format invoice number string according to PRD:
 * Client Name + Serial Number / Month / Year
 * Example: "Aparajita Das 009/11/2026"
 */
function formatInvoiceNumber(clientName, serial, month, year) {
  const serialStr = String(serial).padStart(3, '0');
  const monthStr = String(month).padStart(2, '0');
  const yearStr = String(year);
  const coreNumber = `${serialStr}/${monthStr}/${yearStr}`;

  if (clientName && clientName.trim() !== '') {
    return `${clientName.trim()} ${coreNumber}`;
  }
  return coreNumber;
}

/**
 * Parse an invoice number string to extract client, serial, month, and year.
 * Supports:
 * - "Aparajita Das 009/11/2026"
 * - "Aparajita Das 008/11/26"
 * - "009/11/2026"
 * - "004/11/26"
 */
function parseInvoiceNumber(invNumStr) {
  if (!invNumStr || typeof invNumStr !== 'string') return null;

  const match = invNumStr.trim().match(/^(.*?)\s*(\d{2,4})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;

  const clientName = match[1].trim();
  const serial = parseInt(match[2], 10);
  const month = parseInt(match[3], 10);
  let year = parseInt(match[4], 10);

  if (year < 100) {
    year += 2000;
  }

  return {
    clientName,
    serial,
    month,
    year,
    fullString: invNumStr.trim()
  };
}

/**
 * Get or initialize the counter document for a specific year and month.
 */
async function getOrInitCounter(year, month) {
  const counters = getCountersCollection();
  const counterId = `${year}-${String(month).padStart(2, '0')}`;

  let doc = await counters.findOne({ _id: counterId });
  if (!doc) {
    // Check maximum serial in existing invoices for that month
    const invoices = getInvoicesCollection();
    const existingInvoices = await invoices.find({ year, month }).toArray();
    let maxSerial = 0;
    const used = [];

    for (const inv of existingInvoices) {
      if (inv.serialNumber && inv.serialNumber > maxSerial) {
        maxSerial = inv.serialNumber;
      }
      if (inv.serialNumber) {
        used.push(inv.serialNumber);
      }
    }

    const newDoc = {
      _id: counterId,
      year,
      month,
      highestSerial: maxSerial,
      usedSerials: Array.from(new Set(used)).sort((a, b) => a - b),
      updatedAt: new Date()
    };

    try {
      await counters.insertOne(newDoc);
      return newDoc;
    } catch (err) {
      // In case of race condition during insert, fetch the existing one
      return await counters.findOne({ _id: counterId });
    }
  }

  return doc;
}

/**
 * Peek at what the next invoice number will be without incrementing or allocating.
 * Requirements: "Allocate numbers when invoices are issued, not when draft forms are opened."
 */
async function peekNextNumber(clientName, year, month) {
  const counter = await getOrInitCounter(year, month);
  const nextSerial = (counter.highestSerial || 0) + 1;

  // Retrieve the most recently created bill across the system
  let previousBill = null;
  try {
    const invoices = getInvoicesCollection();
    const lastDoc = await invoices.findOne(
      { status: { $ne: 'trash' } },
      { sort: { year: -1, month: -1, serialNumber: -1, createdAt: -1 } }
    );
    if (lastDoc) {
      if (lastDoc.clientName && !lastDoc.invoiceNumber.includes(lastDoc.clientName)) {
        previousBill = `${lastDoc.clientName} ${lastDoc.invoiceNumber}`;
      } else if (lastDoc.displayInvoiceNumber) {
        previousBill = lastDoc.displayInvoiceNumber;
      } else {
        previousBill = lastDoc.invoiceNumber;
      }
    }
  } catch (e) {
    // ignore
  }

  return {
    serial: nextSerial,
    month,
    year,
    invoiceNumber: formatInvoiceNumber(clientName, nextSerial, month, year),
    previousBill: previousBill || 'Aparajita Das 008/11/2026'
  };
}

/**
 * Atomically allocate the next serial number when an invoice is issued.
 * Uses atomic MongoDB operations ($inc) to prevent duplicate numbers under concurrency.
 */
async function allocateNextInvoiceNumber(clientName, year, month) {
  const counters = getCountersCollection();
  const counterId = `${year}-${String(month).padStart(2, '0')}`;

  // Ensure counter document exists
  await getOrInitCounter(year, month);

  // Atomically increment highestSerial
  const result = await counters.findOneAndUpdate(
    { _id: counterId },
    {
      $inc: { highestSerial: 1 },
      $set: { updatedAt: new Date() }
    },
    { returnDocument: 'after' }
  );

  const updatedDoc = result.value || result;
  const allocatedSerial = updatedDoc.highestSerial;

  // Record this allocated serial in usedSerials
  await counters.updateOne(
    { _id: counterId },
    { $addToSet: { usedSerials: allocatedSerial } }
  );

  const invoiceNumber = formatInvoiceNumber(clientName, allocatedSerial, month, year);

  return {
    serialNumber: allocatedSerial,
    month,
    year,
    invoiceNumber
  };
}

/**
 * Monotonically update counter when importing an invoice.
 * Requirements:
 * - Automatically continue from the highest existing serial.
 * - Importing an older invoice must never decrease the counter.
 * - Importing invoice 012 updates the counter to 012.
 * - Importing invoice 007 afterward does not reduce the counter.
 */
async function registerImportedSerial(serial, month, year) {
  const counters = getCountersCollection();
  const counterId = `${year}-${String(month).padStart(2, '0')}`;

  const current = await getOrInitCounter(year, month);

  const newHighest = Math.max(current.highestSerial || 0, serial);

  await counters.updateOne(
    { _id: counterId },
    {
      $set: { highestSerial: newHighest, updatedAt: new Date() },
      $addToSet: { usedSerials: serial }
    }
  );

  return newHighest;
}

/**
 * Check if an invoice number is already issued or used.
 */
async function isInvoiceNumberUsed(invoiceNumber, excludeId = null) {
  const invoices = getInvoicesCollection();
  const query = { invoiceNumber };
  if (excludeId) {
    const { ObjectId } = require('mongodb');
    try {
      query._id = { $ne: new ObjectId(excludeId) };
    } catch {
      query._id = { $ne: excludeId };
    }
  }

  const existing = await invoices.findOne(query);
  return Boolean(existing);
}

module.exports = {
  formatInvoiceNumber,
  parseInvoiceNumber,
  getOrInitCounter,
  peekNextNumber,
  allocateNextInvoiceNumber,
  registerImportedSerial,
  isInvoiceNumberUsed
};
