const mongoose = require('mongoose');

const FinancialsSchema = new mongoose.Schema({
  quantity: { type: Number, default: 1, min: 0 },
  pricePerUnit: { type: Number, required: true, min: 0 },
  taxableAmount: { type: Number, required: true, min: 0 },
  cgstRate: { type: Number, default: 9, min: 0 },
  cgstAmount: { type: Number, default: 0, min: 0 },
  sgstRate: { type: Number, default: 9, min: 0 },
  sgstAmount: { type: Number, default: 0, min: 0 },
  igstRate: { type: Number, default: 0, min: 0 },
  igstAmount: { type: Number, default: 0, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
  roundOff: { type: Number, default: 0 },
  finalTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const BankSnapshotSchema = new mongoose.Schema({
  accountId: { type: String, default: 'account_1' },
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  ifsc: { type: String, required: true },
  ifscCode: { type: String },
  accountHolder: { type: String, required: true },
  accountHolderName: { type: String },
  branch: { type: String, default: '' }
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
    trim: true,
    index: true
  },
  displayInvoiceNumber: {
    type: String,
    trim: true
  },
  serialNumber: {
    type: Number,
    required: true,
    min: 1
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true,
    min: 2020
  },
  invoiceDate: {
    type: String,
    required: true
  },
  placeOfSupply: {
    type: String,
    default: '19 – West Bengal'
  },
  customerName: {
    type: String,
    required: true,
    default: 'NK Realtors Private Limited',
    trim: true
  },
  customerGstin: {
    type: String,
    default: '',
    trim: true,
    uppercase: true
  },
  customerState: {
    type: String,
    default: '19 – West Bengal'
  },
  billingAddress: {
    type: String,
    default: 'DN-52, PS Srijan Tech Park, Salt Lake, Sector V, Kolkata:-700091, West Bengal'
  },
  clientName: {
    type: String,
    default: '',
    trim: true,
    index: true
  },
  projectName: {
    type: String,
    default: '',
    trim: true
  },
  flatNumber: {
    type: String,
    default: '',
    trim: true
  },
  cvAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  brokeragePercentage: {
    type: Number,
    default: 2,
    min: 0
  },
  itemDescription: {
    type: String,
    default: ''
  },
  hsnSac: {
    type: String,
    default: '1164'
  },
  quantity: {
    type: Number,
    default: 1,
    min: 0
  },
  pricePerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  financials: {
    type: FinancialsSchema,
    required: true
  },
  bankDetails: {
    type: BankSnapshotSchema,
    default: null
  },
  selectedBankAccountId: {
    type: String,
    default: 'account_1'
  },
  status: {
    type: String,
    enum: ['active', 'finalized', 'draft', 'pending_verification', 'verified', 'cancelled', 'amended', 'trash'],
    default: 'finalized',
    index: true
  },
  isLocked: {
    type: Boolean,
    default: true,
    index: true
  },
  integrityHash: {
    type: String,
    index: true
  },
  signature: {
    type: String
  },
  sealedAt: {
    type: Date
  },
  sealedBy: {
    type: String
  },
  finalizedAt: {
    type: Date
  },
  finalizedBy: {
    type: String
  },
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: String
  },
  cancellationReason: {
    type: String
  },
  isAmendment: {
    type: Boolean,
    default: false
  },
  originalInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null
  },
  originalInvoiceNumber: {
    type: String,
    default: null
  },
  amendmentType: {
    type: String,
    enum: ['correction', 'credit_note', 'debit_note', null],
    default: null
  },
  amendments: [{
    type: mongoose.Schema.Types.Mixed
  }],
  isImported: {
    type: Boolean,
    default: false
  },
  importFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'fs.files'
  },
  importRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvoiceImport'
  },
  isHistoricalMigration: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'invoices'
});

// Composite index for sequential queries & uniqueness
InvoiceSchema.index({ year: 1, month: 1, serialNumber: 1 });
InvoiceSchema.index({ clientName: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', InvoiceSchema);
