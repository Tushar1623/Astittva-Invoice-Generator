import assert from 'assert';
import { calculateInvoiceFinancials, formatINR } from './src/utils/calculations.js';
import { numberToWords } from './src/utils/numberToWords.js';
import { getNextInvoiceNumber, validateInvoiceNumber } from './src/utils/invoiceNumber.js';

console.log('--- Running PRD Calculation & Numbering Verification ---');

// 1. Verify PRD Section 5 Example:
// Taxable Amount: ₹53,724
// CGST (9%): ₹4,835.16
// SGST (9%): ₹4,835.16
// Subtotal: ₹63,394.32
// Round-off: -₹0.32
// Final Total: ₹63,394.00
const calc = calculateInvoiceFinancials({
  quantity: 1,
  pricePerUnit: 53724,
  cgstRate: 9,
  sgstRate: 9
});

console.log('Calculated Result:', calc);
assert.strictEqual(calc.taxableAmount, 53724, 'Taxable amount must be 53724');
assert.strictEqual(calc.cgstAmount, 4835.16, 'CGST must be 4835.16');
assert.strictEqual(calc.sgstAmount, 4835.16, 'SGST must be 4835.16');
assert.strictEqual(calc.subtotal, 63394.32, 'Subtotal must be 63394.32');
assert.strictEqual(calc.roundOff, -0.32, 'Round-off must be -0.32');
assert.strictEqual(calc.finalTotal, 63394, 'Final Total must be 63394');
console.log('✓ PRD Section 5 calculation example matched perfectly!');

// 2. Verify PRD Section 8 Example:
// ₹63,394.00 -> Sixty-three thousand three hundred ninety-four rupees only.
const words = numberToWords(63394);
console.log('Amount in Words:', words);
assert.strictEqual(words, 'Sixty-three thousand three hundred ninety-four rupees only.');
console.log('✓ PRD Section 8 number to words matched perfectly!');

// 3. Verify PRD Section 7 Invoice Number Format:
// e.g. 008/11/26
assert.strictEqual(validateInvoiceNumber('008/11/26'), true);
assert.strictEqual(validateInvoiceNumber('001/05/26'), true);
assert.strictEqual(validateInvoiceNumber('invalid-number'), false);
console.log('✓ Invoice number validator verified!');

console.log('\n🎉 ALL PRD LOGIC CHECKS PASSED!\n');
