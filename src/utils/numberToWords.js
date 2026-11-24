/**
 * Converts numbers into Indian English currency wording
 * Compliant with PRD Section 8
 * 
 * Example:
 * 63394.00 -> "Sixty-three thousand three hundred ninety-four rupees only."
 */

const units = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigit(num) {
  if (num < 20) return units[num];
  const t = Math.floor(num / 10);
  const u = num % 10;
  return tens[t] + (u > 0 ? '-' + units[u].toLowerCase() : '');
}

function convertThreeDigit(num) {
  const h = Math.floor(num / 100);
  const rem = num % 100;
  let str = '';
  if (h > 0) {
    str += units[h].toLowerCase() + ' hundred';
    if (rem > 0) str += ' ';
  }
  if (rem > 0) {
    str += convertTwoDigit(rem).toLowerCase();
  }
  return str.trim();
}

/**
 * Converts positive integer into Indian numbering words (Crore, Lakh, Thousand, Hundred)
 */
function integerToWords(num) {
  if (num === 0) return 'zero';

  let crore = Math.floor(num / 10000000);
  num %= 10000000;

  let lakh = Math.floor(num / 100000);
  num %= 100000;

  let thousand = Math.floor(num / 1000);
  num %= 1000;

  let hundredPart = num;

  const parts = [];

  if (crore > 0) {
    parts.push(convertThreeDigit(crore) + ' crore');
  }
  if (lakh > 0) {
    parts.push(convertThreeDigit(lakh) + ' lakh');
  }
  if (thousand > 0) {
    parts.push(convertThreeDigit(thousand) + ' thousand');
  }
  if (hundredPart > 0) {
    parts.push(convertThreeDigit(hundredPart));
  }

  return parts.join(' ').trim();
}

/**
 * Main function: formats amount into Indian Currency Words
 * e.g., 63394 -> "Sixty-three thousand three hundred ninety-four rupees only."
 */
export function numberToWords(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '';
  }

  const rounded = Math.round(Number(amount) * 100) / 100;
  const rupeePart = Math.floor(Math.abs(rounded));
  const paisePart = Math.round((Math.abs(rounded) - rupeePart) * 100);

  let words = integerToWords(rupeePart);
  // Capitalize first letter
  words = words.charAt(0).toUpperCase() + words.slice(1);

  if (paisePart > 0) {
    const paiseWords = convertTwoDigit(paisePart).toLowerCase();
    return `${words} rupees and ${paiseWords} paise only.`;
  }

  return `${words} rupees only.`;
}
