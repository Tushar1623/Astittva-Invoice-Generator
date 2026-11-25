function getSigningSecret(name) {
  const secret = process.env[name];
  if (!secret) {
    throw new Error(`${name} must be set in the backend environment.`);
  }
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error(`${name} must be at least 32 bytes.`);
  }
  return secret;
}

module.exports = { getSigningSecret };
