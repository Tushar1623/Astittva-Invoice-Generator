const express = require('express');
const router = express.Router();
const {
  getInvoices,
  getInvoiceById,
  getNextNumber,
  createInvoice,
  updateInvoice,
  trashInvoice,
  restoreInvoice,
  permanentDeleteInvoice
} = require('../controllers/invoiceController');
const { optionalAuth, requireAdmin } = require('../middleware/auth');

router.get('/', optionalAuth, getInvoices);
router.get('/next-number', optionalAuth, getNextNumber);
router.get('/:id', optionalAuth, getInvoiceById);
router.post('/', optionalAuth, createInvoice);
router.put('/:id', optionalAuth, updateInvoice);
router.post('/:id/trash', optionalAuth, trashInvoice);
router.post('/:id/restore', optionalAuth, restoreInvoice);
router.delete('/:id', optionalAuth, permanentDeleteInvoice);

module.exports = router;
