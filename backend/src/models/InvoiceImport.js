const mongoose = require('mongoose');

const InvoiceImportSchema = new mongoose.Schema({
  originalFilename: {
    type: String,
    required: true,
    trim: true
  },
  fileHash: {
    type: String,
    required: true,
    index: true
  },
  gridFsFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'fs.files',
    required: true,
    index: true
  },
  mimeType: {
    type: String,
    default: 'application/pdf'
  },
  fileSize: {
    type: Number,
    default: 0
  },
  extractedText: {
    type: String,
    default: ''
  },
  extractedData: {
    invoiceNumber: { type: String, default: '' },
    clientName: { type: String, default: '' },
    invoiceDate: { type: String, default: '' },
    customerName: { type: String, default: '' },
    projectName: { type: String, default: '' },
    flatNumber: { type: String, default: '' },
    taxableAmount: { type: Number, default: 0 },
    finalTotal: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['pending_verification', 'review_required', 'verified', 'duplicate', 'failed'],
    default: 'pending_verification',
    index: true
  },
  warning: {
    type: String,
    default: null
  },
  verifiedInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null
  },
  verifiedInvoiceNumber: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'invoiceImports'
});

InvoiceImportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('InvoiceImport', InvoiceImportSchema);
