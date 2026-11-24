const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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
