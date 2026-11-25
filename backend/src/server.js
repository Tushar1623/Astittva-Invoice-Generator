const express = require('express');
const cors = require('cors');
const path = require('path');

// 1. Load environment variables before dependent services initialize
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

// 2. Validate environment configuration before dependent routes and services load
const { validateSigningEnvironment } = require('./services/signingSecrets');

try {
  validateSigningEnvironment();
} catch (err) {
  console.error('\n' + '='.repeat(80));
  console.error('❌ RENDER / BACKEND STARTUP CONFIGURATION ERROR:');
  console.error(err.message);
  console.error('='.repeat(80) + '\n');
  process.exit(1);
}

const { connectToDatabase } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const importRoutes = require('./routes/importRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ASTITTVA MARKETING Invoice API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/settings', settingsRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server & Connect to Database
async function startServer() {
  try {
    await connectToDatabase();
    app.listen(PORT, () => {
      console.log(`[ASTITTVA Invoice Backend] Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Failed to initialize backend:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
