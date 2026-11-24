/**
 * ASTITTVA Calculation Engine
 * Core financial math for Brokerage, Taxable Amount, GST (CGST/SGST/IGST), Round-Off and Totals.
 */

function calculateFinancials({
  quantity = 1,
  pricePerUnit = 0,
  cgstRate = 9,
  sgstRate = 9,
  igstRate = 0
}) {
  const q = Number(quantity) || 1;
  const p = Number(pricePerUnit) || 0;
  const cRate = Number(cgstRate) || 0;
  const sRate = Number(sgstRate) || 0;
  const iRate = Number(igstRate) || 0;

  // Taxable Amount = Quantity × Price per Unit
  const taxableAmount = Math.round(q * p * 100) / 100;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (iRate > 0) {
    // Inter-state
    igstAmount = Math.round((taxableAmount * (iRate / 100)) * 100) / 100;
  } else {
    // Intra-state standard
    cgstAmount = Math.round((taxableAmount * (cRate / 100)) * 100) / 100;
    sgstAmount = Math.round((taxableAmount * (sRate / 100)) * 100) / 100;
  }

  // Subtotal = Taxable amount + applicable GST
  const subtotal = Math.round((taxableAmount + cgstAmount + sgstAmount + igstAmount) * 100) / 100;

  // Round-off = Difference between subtotal and nearest whole rupee
  const finalTotal = Math.round(subtotal);
  const roundOff = Math.round((finalTotal - subtotal) * 100) / 100;

  return {
    quantity: q,
    pricePerUnit: p,
    taxableAmount,
    cgstRate: cRate,
    cgstAmount,
    sgstRate: sRate,
    sgstAmount,
    igstRate: iRate,
    igstAmount,
    subtotal,
    roundOff,
    finalTotal
  };
}

/**
 * Convert number to Indian currency words format
 * Example: 122068 -> "One lakh twenty-two thousand sixty-eight rupees only."
 */
function numberToWordsINR(amount) {
  if (amount === 0) return 'Zero rupees only.';
  if (!amount || isNaN(amount)) return '';

  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen'];

  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  const num = Math.floor(Math.abs(amount));

  function convertTwoDigits(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    const unit = n % 10;
    const ten = Math.floor(n / 10);
    return tens[ten] + (unit !== 0 ? '-' + ones[unit] : '');
  }

  function convertThreeDigits(n) {
    let result = '';
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    if (hundred > 0) {
      result += ones[hundred] + ' hundred';
      if (rest > 0) result += ' ';
    }
    if (rest > 0) {
      result += convertTwoDigits(rest);
    }
    return result;
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = num % 1000;

  let words = [];

  if (crore > 0) words.push(convertThreeDigits(crore) + ' crore');
  if (lakh > 0) words.push(convertThreeDigits(lakh) + ' lakh');
  if (thousand > 0) words.push(convertThreeDigits(thousand) + ' thousand');
  if (hundred > 0) words.push(convertThreeDigits(hundred));

  let combined = words.join(' ').trim();
  if (!combined) return 'Zero rupees only.';

  combined = combined.charAt(0).toUpperCase() + combined.slice(1);
  return `${combined} rupees only.`;
}

module.exports = {
  calculateFinancials,
  numberToWordsINR
};
