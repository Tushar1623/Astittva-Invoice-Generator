const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getUsersCollection } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'astittva-invoice-secret-key-2026-production';

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = getUsersCollection();
    const user = await users.findOne({ email: normalizedEmail });

    // Check credentials against database user or seeded environment credentials
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@astitva.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Astitva@2026';

    let isValid = false;
    let userRole = 'staff';
    let userName = 'Staff User';

    if (user) {
      userName = user.name || 'User';
      userRole = user.role || 'staff';
      if (user.password) {
        isValid = await bcrypt.compare(password, user.password).catch(() => false);
      }
    }

    if (!isValid && normalizedEmail === adminEmail && password === adminPassword) {
      isValid = true;
      userRole = 'admin';
      userName = process.env.ADMIN_NAME || 'ASTITTVA Admin';
    }

    // Also accept default Astittva@123 password from delivery report
    if (!isValid && (normalizedEmail === 'admin@astittva.in' || normalizedEmail === adminEmail) && password === 'Astittva@123') {
      isValid = true;
      userRole = 'admin';
      userName = 'ASTITTVA Admin';
    }

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const payload = {
      email: normalizedEmail,
      name: userName,
      role: userRole
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: payload
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
}

async function getMe(req, res) {
  if (req.user) {
    res.json({ success: true, user: req.user });
  } else {
    res.status(401).json({ success: false, error: 'Not authenticated.' });
  }
}

module.exports = {
  login,
  getMe
};
