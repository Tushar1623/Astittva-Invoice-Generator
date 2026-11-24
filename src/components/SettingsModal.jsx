import React, { useState } from 'react';
import { 
  X, 
  Building, 
  Landmark, 
  Shield, 
  Hash, 
  Save, 
  RotateCcw,
  CheckCircle,
  FileText,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import { defaultCompanyDetails } from '../data/companyDetails';
import { getDateTokens, getStoredSequences, setStartingSequence } from '../utils/invoiceNumber';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  companyDetails, 
  onSaveDetails 
}) {
  const [activeTab, setActiveTab] = useState('company'); // 'company' | 'bank' | 'tax'
  const [formData, setFormData] = useState({ ...companyDetails });
  
  // Starting sequence configuration for current month
  const { key: currentMonthKey } = getDateTokens(new Date());
  const [nextSeqNum, setNextSeqNum] = useState(() => {
    const sequences = getStoredSequences();
    return (sequences[currentMonthKey] || 0) + 1;
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveDetails(formData);
    if (nextSeqNum && Number(nextSeqNum) >= 1) {
      setStartingSequence(currentMonthKey, nextSeqNum);
    }
    onClose();
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset all company and bank details to preconfigured ASTITTVA defaults?')) {
      setFormData({ ...defaultCompanyDetails });
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(9, 13, 22, 0.72)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1.25rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        maxWidth: '720px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--slate-50)'
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <Sliders size={20} color="var(--gold-500)" />
              <span>System & Company Settings</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: '0.15rem' }}>
              Edit legal headers, bank accounts, default GST rates, and invoice counters.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="btn-icon-only"
            style={{ borderRadius: '50%' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Settings Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          padding: '0 1.75rem',
          background: '#ffffff',
          gap: '0.5rem'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('company')}
            style={{
              padding: '0.85rem 1rem',
              fontSize: '0.84rem',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'company' ? '2.5px solid var(--gold-500)' : '2.5px solid transparent',
              color: activeTab === 'company' ? 'var(--slate-900)' : 'var(--slate-500)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Building size={16} />
            <span>Company Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            style={{
              padding: '0.85rem 1rem',
              fontSize: '0.84rem',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'bank' ? '2.5px solid var(--gold-500)' : '2.5px solid transparent',
              color: activeTab === 'bank' ? 'var(--slate-900)' : 'var(--slate-500)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Landmark size={16} />
            <span>Bank Account</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tax')}
            style={{
              padding: '0.85rem 1rem',
              fontSize: '0.84rem',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'tax' ? '2.5px solid var(--gold-500)' : '2.5px solid transparent',
              color: activeTab === 'tax' ? 'var(--slate-900)' : 'var(--slate-500)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Hash size={16} />
            <span>Tax & Numbering</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.75rem', flex: 1 }}>
          {/* TAB 1: COMPANY PROFILE */}
          {activeTab === 'company' && (
            <div>
              <div className="form-grid">
                <div className="form-group col-span-2">
                  <label className="form-label required">Company Legal Name</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="form-input"
                    style={{ fontWeight: 700 }}
                  />
                </div>

                <div className="form-group col-span-full">
                  <label className="form-label required">Office Address</label>
                  <textarea
                    rows={2}
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="form-textarea"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">RERA Number</label>
                  <input
                    type="text"
                    value={formData.rera}
                    onChange={(e) => setFormData({ ...formData, rera: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">GSTIN</label>
                  <input
                    type="text"
                    required
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="form-input font-mono"
                    style={{ fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">State</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Official Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group col-span-2">
                  <label className="form-label">Official Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BANK DETAILS */}
          {activeTab === 'bank' && (
            <div>
              <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="form-group col-span-2">
                  <label className="form-label required">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="AU Small Finance Bank"
                    className="form-input"
                    style={{ fontWeight: 600 }}
                  />
                </div>

                <div className="form-group col-span-2">
                  <label className="form-label required">Account Holder Name</label>
                  <input
                    type="text"
                    required
                    value={formData.accountHolder}
                    onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                    placeholder="ASTITTVA MARKETING Pvt Ltd"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Bank Account Number</label>
                  <input
                    type="text"
                    required
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="2602262416089178"
                    className="form-input font-mono"
                    style={{ fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">IFSC Code</label>
                  <input
                    type="text"
                    required
                    value={formData.ifsc}
                    onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                    placeholder="AUBL0002624"
                    className="form-input font-mono"
                    style={{ fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div style={{
                background: 'var(--slate-50)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontSize: '0.78rem',
                lineHeight: 1.5
              }}>
                <div style={{ fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.25rem' }}>
                  Bank Details Preview (as printed on invoice footer):
                </div>
                <div><b>Bank Name :</b> {formData.bankName}</div>
                <div><b>Account No. :</b> {formData.accountNumber}</div>
                <div><b>IFSC :</b> {formData.ifsc}</div>
                <div><b>Account Holder :</b> {formData.accountHolder}</div>
              </div>
            </div>
          )}

          {/* TAB 3: TAX & NUMBERING */}
          {activeTab === 'tax' && (
            <div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label required">Default HSN / SAC Code</label>
                  <input
                    type="text"
                    required
                    value={formData.defaultHsn || '1164'}
                    onChange={(e) => setFormData({ ...formData, defaultHsn: e.target.value })}
                    placeholder="1164"
                    className="form-input font-mono"
                  />
                  <span className="form-helper-text">Standard Real Estate SAC: 1164</span>
                </div>

                <div className="form-group">
                  <label className="form-label required">Default CGST Rate (%)</label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    value={formData.defaultCgstRate || 9}
                    onChange={(e) => setFormData({ ...formData, defaultCgstRate: Number(e.target.value) })}
                    className="form-input font-mono"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Default SGST Rate (%)</label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    value={formData.defaultSgstRate || 9}
                    onChange={(e) => setFormData({ ...formData, defaultSgstRate: Number(e.target.value) })}
                    className="form-input font-mono"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">
                    <span>Next Serial Number (Current Month)</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--gold-600)' }}>{currentMonthKey}</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={nextSeqNum}
                    onChange={(e) => setNextSeqNum(Number(e.target.value))}
                    className="form-input font-mono"
                  />
                  <span className="form-helper-text">e.g. 8 produces 008/{currentMonthKey}</span>
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}
            >
              <RotateCcw size={13} />
              <span>Reset to ASTITTVA Defaults</span>
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
              >
                <Save size={15} />
                <span>Save Settings</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
