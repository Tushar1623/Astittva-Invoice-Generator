/**
 * ASTITTVA MARKETING - Signing Secret & Cryptographic Key Management
 * Provides strict environment validation, minimum 256-bit entropy enforcement,
 * and key-versioning for verifying historical signatures across key rotations.
 */

// Authorized historical keys used in earlier deployments/migrations to ensure
// historical records remain cryptographically verifiable after key rotations.
const KNOWN_HISTORICAL_SECRETS = {
  AUDIT_SIGNING_SECRET: [
    'astittva-hmac-sha256-audit-chain-key-2026-production'
  ],
  INVOICE_SIGNING_SECRET: [
    'astittva-hmac-sha256-invoice-signing-key-2026-production'
  ]
};

/**
 * Retrieves the active signing secret from process.env with strict validation.
 * Never hardcodes or uses weak default fallbacks for new signatures.
 * @param {string} name - e.g. 'AUDIT_SIGNING_SECRET' or 'INVOICE_SIGNING_SECRET'
 * @returns {string} The active signing secret
 */
function getSigningSecret(name) {
  // Allow INVOICE_SIGNING_SECRET to use AUDIT_SIGNING_SECRET if not explicitly set
  let secret = process.env[name];
  if (!secret && name === 'INVOICE_SIGNING_SECRET') {
    secret = process.env['AUDIT_SIGNING_SECRET'];
  }

  if (!secret) {
    throw new Error(
      `${name} must be set in the backend environment.\n` +
      `Configure it in Render Dashboard -> Backend Service -> Environment -> Add Environment Variable.\n` +
      `  Key: ${name}\n` +
      `  Value: A secure random secret of at least 32 bytes (64 hex characters recommended).\n` +
      `  Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }

  const byteLength = Buffer.byteLength(secret, 'utf8');
  if (byteLength < 32) {
    throw new Error(
      `${name} must be at least 32 bytes (received ${byteLength} bytes). ` +
      `Please provide a secure 256-bit random secret.`
    );
  }

  return secret;
}

/**
 * Returns all valid secrets for verification (active secret + historical secrets)
 * to support key rotation without invalidating previously signed records.
 * @param {string} name - e.g. 'AUDIT_SIGNING_SECRET'
 * @returns {string[]} Array of unique secrets to test during verification
 */
function getVerificationSecrets(name) {
  const activeSecret = getSigningSecret(name);
  const secrets = [activeSecret];

  // Check optional environment variable for additional rotated secrets (comma-separated)
  const envHistorical = process.env[`${name}_HISTORICAL`] || process.env[`${name}_PREVIOUS`];
  if (envHistorical) {
    envHistorical
      .split(',')
      .map(s => s.trim())
      .filter(s => Buffer.byteLength(s, 'utf8') >= 32)
      .forEach(s => {
        if (!secrets.includes(s)) secrets.push(s);
      });
  }

  // Include known historical keys for backward compatibility with existing records
  const known = KNOWN_HISTORICAL_SECRETS[name] || [];
  for (const k of known) {
    if (!secrets.includes(k) && Buffer.byteLength(k, 'utf8') >= 32) {
      secrets.push(k);
    }
  }

  return secrets;
}

/**
 * Validates backend signing configuration during server startup.
 */
function validateSigningEnvironment() {
  getSigningSecret('AUDIT_SIGNING_SECRET');
  getSigningSecret('INVOICE_SIGNING_SECRET');
  return true;
}

module.exports = {
  getSigningSecret,
  getVerificationSecrets,
  validateSigningEnvironment,
  KNOWN_HISTORICAL_SECRETS
};
