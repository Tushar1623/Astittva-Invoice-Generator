const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { getSigningSecret } = require('./signingSecrets');

const INVOICE_SIGNING_SECRET = getSigningSecret('INVOICE_SIGNING_SECRET');

function sortKeysRecursively(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysRecursively);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((sorted, key) => {
      sorted[key] = sortKeysRecursively(value[key]);
      return sorted;
    }, {});
  }
  return value;
}

/**
 * Creates a deterministic, canonical JSON representation of protected invoice fields.
 * Any change to client, customer, amounts, GST, bank details, or numbering modifies this canonical payload.
 */
function canonicalizeInvoiceData(inv) {
  if (!inv) return '';

  const fin = inv.financials || {};
  const bank = inv.bankDetails || {};

  const canonicalObj = {
    billingAddress: (inv.billingAddress || '').trim(),
    brokeragePercentage: Number(inv.brokeragePercentage || 0),
    clientName: (inv.clientName || '').trim(),
    customerGstin: (inv.customerGstin || '').trim().toUpperCase(),
    customerName: (inv.customerName || '').trim(),
    customerState: (inv.customerState || '').trim(),
    cvAmount: Number(inv.cvAmount || 0),
    financials: {
      cgstAmount: Number(fin.cgstAmount || 0),
      cgstRate: Number(fin.cgstRate || 0),
      finalTotal: Number(fin.finalTotal || 0),
      igstAmount: Number(fin.igstAmount || 0),
      igstRate: Number(fin.igstRate || 0),
      pricePerUnit: Number(fin.pricePerUnit || 0),
      quantity: Number(fin.quantity || 1),
      roundOff: Number(fin.roundOff || 0),
      sgstAmount: Number(fin.sgstAmount || 0),
      sgstRate: Number(fin.sgstRate || 0),
      subtotal: Number(fin.subtotal || 0),
      taxableAmount: Number(fin.taxableAmount || 0)
    },
    flatNumber: (inv.flatNumber || '').trim(),
    hsnSac: (inv.hsnSac || '1164').trim(),
    invoiceDate: String(inv.invoiceDate || '').trim(),
    invoiceNumber: String(inv.invoiceNumber || '').trim(),
    itemDescription: (inv.itemDescription || '').trim(),
    month: Number(inv.month || 0),
    placeOfSupply: (inv.placeOfSupply || '').trim(),
    pricePerUnit: Number(inv.pricePerUnit || fin.pricePerUnit || 0),
    projectName: (inv.projectName || '').trim(),
    quantity: Number(inv.quantity || fin.quantity || 1),
    selectedBank: {
      accountId: String(bank.accountId || inv.selectedBankAccountId || 'account_1').trim(),
      accountNumber: String(bank.accountNumber || '').trim(),
      bankName: String(bank.bankName || '').trim(),
      ifsc: String(bank.ifsc || bank.ifscCode || '').trim()
    },
    serialNumber: Number(inv.serialNumber || 0),
    year: Number(inv.year || 0)
  };

  return JSON.stringify(sortKeysRecursively(canonicalObj));
}

/**
 * Computes SHA-256 hash of canonical invoice representation.
 */
function computeInvoiceHash(inv) {
  const canonical = canonicalizeInvoiceData(inv);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Computes server-side HMAC-SHA256 digital signature of the invoice hash.
 */
function computeInvoiceSignature(invoiceHash) {
  return crypto.createHmac('sha256', INVOICE_SIGNING_SECRET).update(invoiceHash).digest('hex');
}

/**
 * Seals an invoice upon issuance or finalization.
 * Attaches immutable integrity hash and server-controlled HMAC signature.
 */
function sealInvoice(inv, user = null) {
  const hash = computeInvoiceHash(inv);
  const signature = computeInvoiceSignature(hash);
  const timestamp = new Date();
  const userName = user?.name || user?.email || 'System';

  return {
    integrityHash: hash,
    signature,
    sealedAt: timestamp,
    sealedBy: userName,
    finalizedAt: inv.finalizedAt || timestamp,
    finalizedBy: inv.finalizedBy || userName,
    isLocked: true,
    securityLevel: 'HMAC_SHA256_IMMUTABLE'
  };
}

/**
 * Cryptographically verifies an invoice against its stored hash and digital signature.
 * Detects any direct MongoDB editing or unauthorized tampering.
 */
async function verifyInvoiceIntegrity(inv, gridFsBucket = null) {
  if (!inv) {
    return {
      verified: false,
      status: 'FAILED',
      error: 'Invoice not provided'
    };
  }

  // 1. Data Hash Verification
  const recomputedHash = computeInvoiceHash(inv);
  const storedHash = inv.integrityHash;

  let dataHashMatch = false;
  if (storedHash) {
    dataHashMatch = (storedHash === recomputedHash);
  } else {
    // Legacy invoice without stored hash
    dataHashMatch = false;
  }

  // 2. HMAC Signature Verification
  let signatureValid = false;
  if (inv.signature && storedHash) {
    const expectedSig = computeInvoiceSignature(storedHash);
    signatureValid = (inv.signature === expectedSig);
  }

  // 3. GridFS Receipt File Check (if imported)
  let receiptFileValid = 'N/A';
  if (inv.importFileId && gridFsBucket) {
    try {
      const files = await gridFsBucket.find({ _id: inv.importFileId }).toArray();
      if (files && files.length > 0) {
        receiptFileValid = true;
      } else {
        receiptFileValid = false;
      }
    } catch {
      receiptFileValid = false;
    }
  }

  const isTampered = Boolean(storedHash && (!dataHashMatch || !signatureValid));
  const isVerified = Boolean(storedHash && dataHashMatch && signatureValid && receiptFileValid !== false);

  return {
    verified: isVerified,
    status: isVerified ? 'VERIFIED' : (isTampered ? 'MISMATCH' : 'UNSEALED_LEGACY'),
    checks: {
      dataHashMatch,
      signatureValid,
      receiptFileValid
    },
    storedHash: storedHash || null,
    recalculatedHash: recomputedHash,
    storedSignature: inv.signature ? `${inv.signature.slice(0, 12)}...` : null,
    sealedAt: inv.sealedAt || inv.finalizedAt || inv.createdAt,
    sealedBy: inv.sealedBy || inv.finalizedBy || 'System',
    tamperDetected: isTampered
  };
}

module.exports = {
  canonicalizeInvoiceData,
  computeInvoiceHash,
  computeInvoiceSignature,
  sealInvoice,
  verifyInvoiceIntegrity
};
