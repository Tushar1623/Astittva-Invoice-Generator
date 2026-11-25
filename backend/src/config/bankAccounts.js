/**
 * ASTITTVA MARKETING - Centralized Bank Accounts Configuration
 * Single source of truth for company bank accounts.
 */

const CONFIGURED_BANK_ACCOUNTS = [
  {
    id: 'account_1',
    key: 'account_1',
    isDefault: true,
    bankName: 'AU Small Finance Bank',
    accountHolder: 'ASTITTVA MARKETING Pvt Ltd',
    accountHolderName: 'ASTITTVA MARKETING Pvt Ltd',
    accountNumber: '2602262416089178',
    ifsc: 'AUBL0002624',
    ifscCode: 'AUBL0002624',
    branch: 'Kolkata Main Branch'
  },
  {
    id: 'account_2',
    key: 'account_2',
    isDefault: false,
    bankName: 'ICICI Bank Limited',
    accountHolder: 'ASTITTVA MARKETING PRIVATE LIMITED',
    accountHolderName: 'ASTITTVA MARKETING PRIVATE LIMITED',
    accountNumber: '458805000106',
    ifsc: 'ICIC0004588',
    ifscCode: 'ICIC0004588',
    branch: 'Kolkata Branch'
  }
];

function getDefaultBankAccount() {
  return CONFIGURED_BANK_ACCOUNTS.find(acc => acc.isDefault) || CONFIGURED_BANK_ACCOUNTS[0];
}

function getBankAccountById(id) {
  if (!id) return null;
  return CONFIGURED_BANK_ACCOUNTS.find(acc => acc.id === id || acc.key === id) || null;
}

function validateBankAccount(account) {
  if (!account || typeof account !== 'object') {
    return { valid: false, error: 'Bank account details are required.' };
  }
  const bankName = (account.bankName || '').trim();
  const accountNumber = String(account.accountNumber || '').trim();
  const ifsc = (account.ifsc || account.ifscCode || '').trim().toUpperCase();
  const accountHolder = (account.accountHolder || account.accountHolderName || '').trim();

  if (!bankName) {
    return { valid: false, error: 'Bank name is required.' };
  }
  if (!accountNumber || accountNumber.length < 8) {
    return { valid: false, error: 'Valid bank account number is required.' };
  }
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(ifsc)) {
    return { valid: false, error: `Invalid IFSC Code format: "${ifsc}". Must be 11 characters (e.g. AUBL0002624, ICIC0004588).` };
  }
  if (!accountHolder) {
    return { valid: false, error: 'Account holder name is required.' };
  }

  return {
    valid: true,
    normalized: {
      accountId: account.id || account.accountId || 'custom',
      bankName,
      accountNumber,
      ifsc,
      accountHolder,
      accountHolderName: accountHolder,
      ifscCode: ifsc,
      branch: account.branch || ''
    }
  };
}

module.exports = {
  CONFIGURED_BANK_ACCOUNTS,
  getDefaultBankAccount,
  getBankAccountById,
  validateBankAccount
};
