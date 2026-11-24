/**
 * Automatic GST and Financial Calculations for ASTITTVA MARKETING
 * Compliant with PRD Section 5
 */

/**
 * Calculates Taxable Amount, CGST, SGST, Subtotal, Round-off, and Final Total
 * 
 * Formula:
 * Taxable Amount = Quantity × Price per Unit
 * CGST = Taxable Amount × CGST Rate / 100
 * SGST = Taxable Amount × SGST Rate / 100
 * Subtotal = Taxable Amount + CGST + SGST
 * Final Total = Round(Subtotal)
 * Round-off = Final Total − Subtotal
 */
export function calculateInvoiceFinancials({
  quantity = 1,
  pricePerUnit = 0,
  cvAmount = null,
  brokeragePercentage = null,
  cgstRate = 9,
  sgstRate = 9
}) {
  const qty = Number(quantity) || 1;
  let unitPrice = Number(pricePerUnit) || 0;

  // If CV (Consideration Value) and Brokerage % are provided, price per unit can derive from it
  if (cvAmount !== null && cvAmount !== undefined && cvAmount !== "" &&
      brokeragePercentage !== null && brokeragePercentage !== undefined && brokeragePercentage !== "") {
    const cv = Number(cvAmount) || 0;
    const bPercent = Number(brokeragePercentage) || 0;
    unitPrice = Math.round((cv * (bPercent / 100)) * 100) / 100;
  }

  // Taxable Amount = Quantity × Price per Unit
  const taxableAmount = Math.round((qty * unitPrice) * 100) / 100;

  const cRate = Number(cgstRate) || 0;
  const sRate = Number(sgstRate) || 0;

  // CGST = Taxable Amount × CGST Rate / 100
  const cgstAmount = Math.round((taxableAmount * (cRate / 100)) * 100) / 100;

  // SGST = Taxable Amount × SGST Rate / 100
  const sgstAmount = Math.round((taxableAmount * (sRate / 100)) * 100) / 100;

  // Subtotal = Taxable Amount + CGST + SGST
  const subtotal = Math.round((taxableAmount + cgstAmount + sgstAmount) * 100) / 100;

  // Final Total = Round(Subtotal)
  const finalTotal = Math.round(subtotal);

  // Round-off = Final Total − Subtotal
  const roundOff = Math.round((finalTotal - subtotal) * 100) / 100;

  return {
    quantity: qty,
    pricePerUnit: unitPrice,
    taxableAmount,
    cgstRate: cRate,
    cgstAmount,
    sgstRate: sRate,
    sgstAmount,
    subtotal,
    roundOff,
    finalTotal
  };
}

/**
 * Formats a number to Indian currency format with or without symbol
 * e.g., 63394 -> "63,394.00"
 */
export function formatINR(amount, includeSymbol = false, forceDecimals = true) {
  if (amount === undefined || amount === null || isNaN(amount)) return includeSymbol ? '₹ 0.00' : '0.00';
  const num = Number(amount);
  
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: forceDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });

  return includeSymbol ? `₹ ${formatted}` : formatted;
}

/**
 * Builds item description from property details
 */
export function generateItemDescription({
  clientName = '',
  projectName = '',
  flatNumber = '',
  brokeragePercentage = '',
  cvAmount = ''
}) {
  const parts = [];
  if (brokeragePercentage) parts.push(`Brokerage of ${brokeragePercentage}%`);
  if (projectName) parts.push(`on sale value of unit at "${projectName}"`);
  if (flatNumber) parts.push(`Flat No. ${flatNumber}`);
  if (clientName) parts.push(`for ${clientName}`);
  if (cvAmount) parts.push(`for Total Consideration Value ₹ ${formatINR(cvAmount, false, false)}`);

  return parts.length > 0 ? parts.join(', ') : 'Professional Brokerage Services';
}
