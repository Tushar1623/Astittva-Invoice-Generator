const crypto = require('crypto');
const pdfParse = require('pdf-parse');

/**
 * Calculate SHA-256 hash of a file buffer to detect duplicate uploads.
 */
function calculateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Extract text from PDF buffer or image.
 */
async function extractTextFromFile(buffer, mimeType) {
  if (mimeType === 'application/pdf') {
    try {
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (err) {
      console.warn('[OCR] PDF text extraction error:', err.message);
      return '';
    }
  }
  // For images, return empty text if no native OCR binary installed,
  // letting user review and manually populate fields in the review UI
  return '';
}

/**
 * Parse extracted text to identify invoice fields.
 */
function parseInvoiceFieldsFromText(text) {
  if (!text || typeof text !== 'string') {
    return {
      invoiceNumber: '',
      invoiceDate: '',
      clientName: '',
      customerName: '',
      projectName: '',
      flatNumber: '',
      taxableAmount: 0,
      finalTotal: 0
    };
  }

  const fields = {};

  // 1. Invoice Number (e.g. 006/11/26, 001/10/26, Goutam Bhattacharya 006/11/2026)
  const invNumMatch = text.match(/(?:Invoice\s*(?:No\.?|Number)|Inv\s*#?)[:\s]*([A-Za-z\s\.]*?\d{2,4}\/\d{1,2}\/\d{2,4})/i) ||
                      text.match(/(\d{3}\/\d{2}\/\d{2,4})/);
  if (invNumMatch) {
    fields.invoiceNumber = invNumMatch[1].trim().replace(/\s+Invoice$/, '');
  }

  // 2. Client / Buyer Name
  const clientMatch = text.match(/(?:Cllient|Client|Buyer)\s*Name[:\s]*([A-Za-z\s\.]+?)(?:\r?\n|Property|Unit|Project|$)/i) ||
                      text.match(/by\s+([A-Za-z\s\.]+?)\s+of\s+₹/i);
  if (clientMatch) {
    fields.clientName = clientMatch[1].trim();
  }

  // 3. Customer / Bill To Name (e.g. NK Realtors, Vinayak Group)
  const custMatch = text.match(/(?:Bill\s*To|Customer\s*Details|Customer\s*Name)[:\s\r\n]*([A-Za-z0-9\s\.,]+?(?:Pvt|Private|Ltd|Limited|Realtor|Group)?)(?:\r?\n|$)/i);
  if (custMatch) {
    fields.customerName = custMatch[1].trim();
  }

  // 4. Project Name (e.g. Vayu, ASTHA, 21 Acres, Merlin Elements)
  const projMatch = text.match(/Project[:\s]*([A-Za-z0-9\s]+?)(?:\r?\n|$)/i) ||
                    text.match(/at\s+([A-Za-z0-9\s]+?)\s+by/i);
  if (projMatch) {
    fields.projectName = projMatch[1].trim();
  }

  // 5. Flat / Unit Number
  const flatMatch = text.match(/(?:Property\s*\/\s*Unit|Unit|Flat)[:\s]*([A-Za-z0-9\s\-,]+?)(?:\r?\n|$)/i);
  if (flatMatch) {
    fields.flatNumber = flatMatch[1].trim();
  }

  // 6. Invoice Date (e.g. 06-11-2026, 2026-11-06)
  const dateMatch = text.match(/(?:Date|Invoice\s*Date)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i) ||
                    text.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    const rawDate = dateMatch[1].trim();
    // Normalize to YYYY-MM-DD
    const parts = rawDate.split(/[\/\-\.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        fields.invoiceDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
        fields.invoiceDate = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }

  // 7. Amounts
  const totalMatch = text.match(/(?:Final\s*Total|Total\s*Amount|Total)[:\s]*₹?\s*([\d,]+(?:\.\d{2})?)/i);
  if (totalMatch) {
    fields.finalTotal = parseFloat(totalMatch[1].replace(/,/g, ''));
  }

  const taxableMatch = text.match(/(?:Taxable\s*Amount|Taxable\s*Base)[:\s]*₹?\s*([\d,]+(?:\.\d{2})?)/i);
  if (taxableMatch) {
    fields.taxableAmount = parseFloat(taxableMatch[1].replace(/,/g, ''));
  }

  return fields;
}

module.exports = {
  calculateFileHash,
  extractTextFromFile,
  parseInvoiceFieldsFromText
};
