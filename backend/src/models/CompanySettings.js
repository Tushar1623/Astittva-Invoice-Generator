const mongoose = require('mongoose');

const BankDetailsSchema = new mongoose.Schema({
  bankName: { type: String, default: 'AU Small Finance Bank' },
  accountNumber: { type: String, default: '2602262416089178' },
  ifsc: { type: String, default: 'AUBL0002624' },
  accountHolder: { type: String, default: 'ASTITTVA MARKETING Pvt Ltd' },
  branch: { type: String, default: 'Kolkata Main Branch' }
}, { _id: false });

const CompanySettingsSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'default_settings'
  },
  companyName: {
    type: String,
    default: 'ASTITTVA MARKETING Pvt Ltd'
  },
  tagline: {
    type: String,
    default: 'Tax Invoice Engine'
  },
  address: {
    type: String,
    default: 'PS IXL Building, 5th Floor, Room 511, Biswa Bangla Sarani, Atghara, New Town, Kolkata, West Bengal – 700136'
  },
  rera: {
    type: String,
    default: 'WBRERA/R-001354'
  },
  phone: {
    type: String,
    default: '+91 92303 74718'
  },
  email: {
    type: String,
    default: 'businessdevelopment@astittva.in'
  },
  gstin: {
    type: String,
    default: '19ABFCA7189M1ZV'
  },
  pan: {
    type: String,
    default: 'ABFCA7189M'
  },
  state: {
    type: String,
    default: '19 – West Bengal'
  },
  bank: {
    type: BankDetailsSchema,
    default: () => ({})
  },
  logoUrl: {
    type: String,
    default: '/logo.png'
  }
}, {
  timestamps: true,
  collection: 'companySettings'
});

module.exports = mongoose.model('CompanySettings', CompanySettingsSchema);
