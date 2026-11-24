/**
 * Invoice Numbering System
 * Compliant with PRD Section 7
 * Format: XXX/MM/YY (e.g. 008/11/26)
 */

const STORAGE_KEY_SEQ = 'astittva_invoice_sequences';
const STORAGE_KEY_INVOICES = 'astittva_invoices';

/**
 * Returns MM and YY components from a date object or string
 */
export function getDateTokens(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const key = `${month}/${year}`;
  return { month, year, key };
}

/**
 * Reads all stored sequence numbers from localStorage
 */
export function getStoredSequences() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SEQ);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Saves sequence map to localStorage
 */
export function saveSequences(seqMap) {
  try {
    localStorage.setItem(STORAGE_KEY_SEQ, JSON.stringify(seqMap));
  } catch (e) {
    console.error('Error saving sequences', e);
  }
}

/**
 * Checks if an invoice number already exists in saved invoices
 */
export function isInvoiceNumberDuplicate(invoiceNumber, currentId = null) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_INVOICES);
    if (!saved) return false;
    const invoices = JSON.parse(saved);
    return invoices.some(inv => 
      inv.invoiceNumber?.trim().toLowerCase() === invoiceNumber?.trim().toLowerCase() &&
      inv.id !== currentId
    );
  } catch (e) {
    return false;
  }
}

/**
 * Generates the next sequential invoice number for a given date
 * e.g. "008/11/26"
 */
export function getNextInvoiceNumber(dateInput) {
  const { month, year, key } = getDateTokens(dateInput);
  const sequences = getStoredSequences();

  // If key doesn't exist, calculate based on existing invoices for that month or start at 1
  let currentSeq = sequences[key] || 0;

  // Double check saved invoices to avoid any collision
  try {
    const saved = localStorage.getItem(STORAGE_KEY_INVOICES);
    if (saved) {
      const invoices = JSON.parse(saved);
      invoices.forEach(inv => {
        if (inv.invoiceNumber) {
          const parts = inv.invoiceNumber.split('/');
          if (parts.length === 3 && parts[1] === month && parts[2] === year) {
            const num = parseInt(parts[0], 10);
            if (!isNaN(num) && num > currentSeq) {
              currentSeq = num;
            }
          }
        }
      });
    }
  } catch (e) {}

  const nextSeq = currentSeq + 1;
  const seqStr = String(nextSeq).padStart(3, '0');
  return `${seqStr}/${month}/${year}`;
}

/**
 * Commits a generated or used invoice number sequence to storage
 */
export function commitInvoiceNumber(invoiceNumber) {
  if (!invoiceNumber) return;
  const parts = invoiceNumber.split('/');
  if (parts.length === 3) {
    const seq = parseInt(parts[0], 10);
    const month = parts[1];
    const year = parts[2];
    const key = `${month}/${year}`;

    if (!isNaN(seq)) {
      const sequences = getStoredSequences();
      if (!sequences[key] || seq > sequences[key]) {
        sequences[key] = seq;
        saveSequences(sequences);
      }
    }
  }
}

/**
 * Configures the starting or next sequential number for a specific month/year key (e.g. "11/26")
 */
export function setStartingSequence(key, nextNumber) {
  const num = parseInt(nextNumber, 10);
  if (!isNaN(num) && num >= 1) {
    const sequences = getStoredSequences();
    sequences[key] = num - 1;
    saveSequences(sequences);
  }
}

/**
 * Validates invoice number format: XXX/MM/YY
 */
export function validateInvoiceNumber(num) {
  if (!num || typeof num !== 'string') return false;
  const regex = /^\d{3,4}\/\d{2}\/\d{2}$/;
  return regex.test(num.trim());
}
