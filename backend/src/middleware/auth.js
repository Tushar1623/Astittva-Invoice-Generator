const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'astittva-invoice-secret-key-2026-production';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required. Missing Bearer token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ success: false, error: 'Administrator permission required.' });
    }
  });
}

// Optional auth: populates req.user if token present, continues even if not
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // Ignore invalid token in optional auth
    }
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth
};
