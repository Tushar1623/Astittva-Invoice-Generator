import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  FileText, 
  Home, 
  Percent, 
  RotateCcw, 
  Save, 
  Eye, 
  AlertCircle,
  Sparkles,
  Calendar,
  MapPin,
  User,
  Hash,
  RefreshCw,
  Edit2,
  Landmark
} from 'lucide-react';
import { calculateInvoiceFinancials, generateItemDescription, formatINR } from '../utils/calculations';
import { api } from '../services/api';
import { defaultBankAccounts } from '../data/companyDetails';
import Calculator from './Calculator';

export default function InvoiceForm({ 
  initialInvoice = null, 
  companyDetails, 
  lastInvoice = null,
  onSave, 
  onSaveAndPreview, 
  onCancel 
}) {
  const isEditing = Boolean(initialInvoice?._id || initialInvoice?.id);

  // Available bank accounts (Account 1: AU Small Finance Bank, Account 2: ICICI Bank Limited)
  const availableBankAccounts = (companyDetails?.bankAccounts && companyDetails.bankAccounts.length > 0)
    ? companyDetails.bankAccounts
    : defaultBankAccounts;

  const defaultAccount = availableBankAccounts.find(a => a.isDefault) || availableBankAccounts[0];

  const computePreviousBill = (lastInv) => {
    if (lastInv) {
      if (lastInv.displayInvoiceNumber) return lastInv.displayInvoiceNumber;
      if (lastInv.clientName && !lastInv.invoiceNumber.includes(lastInv.clientName)) {
        return `${lastInv.clientName} ${lastInv.invoiceNumber}`;
      }
      return lastInv.invoiceNumber;
    }
    return 'Aparajita Das 008/11/2026';
  };

  const [previousBill, setPreviousBill] = useState(() => computePreviousBill(lastInvoice));

  // Form State
  const [formData, setFormData] = useState(() => {
    if (initialInvoice) {
      const initialBankDetails = initialInvoice.bankDetails || defaultAccount;
      const initialBankId = initialInvoice.selectedBankAccountId || initialBankDetails.accountId || defaultAccount.id;
      return { 
        ...initialInvoice,
        selectedBankAccountId: initialBankId,
        bankDetails: initialBankDetails,
        isManualInvoiceNumber: true
      };
    }
    const today = new Date().toISOString().slice(0, 10);
    return {
      // Invoice Details
      invoiceNumber: '',
      autoAllocate: true,
      isManualInvoiceNumber: false,
      invoiceDate: today,
      placeOfSupply: '19 – West Bengal',

      // Customer Details (Bill To)
      customerName: 'NK Realtors Private Limited',
      billingAddress: 'DN-52, PS Srijan Tech Park, Salt Lake, Sector V, Kolkata:-700091,\nWest Bengal',
      customerGstin: '19AABCN7336G1ZC',
      customerState: '19 – West Bengal',

      // Property Details
      clientName: 'Aparajita Das',
      projectName: 'Vayu',
      flatNumber: 'B12',
      cvAmount: 5172400,
      brokeragePercentage: 2,

      // Item & Pricing
      itemDescription: '',
      isCustomDescription: false,
      hsnSac: companyDetails?.defaultHsn || '1164',
      quantity: 1,
      pricePerUnit: 103448,
      cgstRate: companyDetails?.defaultCgstRate || 9,
      sgstRate: companyDetails?.defaultSgstRate || 9,

      // Bank Account Selection (Default Account 1: AU Small Finance Bank)
      selectedBankAccountId: defaultAccount.id,
      bankDetails: defaultAccount
    };
  });

  // Keep form synchronized when switching editing target
  useEffect(() => {
    if (initialInvoice) {
      const initialBankDetails = initialInvoice.bankDetails || defaultAccount;
      const initialBankId = initialInvoice.selectedBankAccountId || initialBankDetails.accountId || defaultAccount.id;
      setFormData({
        ...initialInvoice,
        selectedBankAccountId: initialBankId,
        bankDetails: initialBankDetails,
        isManualInvoiceNumber: true
      });
      if (initialInvoice.invoiceNumber) {
        setPreviewNumber(initialInvoice.invoiceNumber);
      }
    }
  }, [initialInvoice]);

  const [previewNumber, setPreviewNumber] = useState('');
  const [loadingNumber, setLoadingNumber] = useState(false);

  // Helper to extract effective client name for prefixing invoice number
  const getEffectiveClientName = (client, customer) => {
    const cName = (client || '').trim();
    if (cName) return cName;
    const custName = (customer || '').trim();
    if (custName && custName !== 'NK Realtors Private Limited') return custName;
    return custName || '';
  };

  // Synchronize Previous Bill and suggest next Invoice Number
  useEffect(() => {
    let isMounted = true;
    if (isEditing) {
      if (formData.invoiceNumber) {
        setPreviewNumber(formData.invoiceNumber);
      }
      return;
    }

    const effectiveName = getEffectiveClientName(formData.clientName, formData.customerName);

    async function fetchNext() {
      setLoadingNumber(true);
      try {
        const res = await api.peekNextNumber(effectiveName, formData.invoiceDate, formData.customerName);
        if (isMounted && res.success) {
          setPreviewNumber(res.invoiceNumber);
          if (res.previousBill) {
            setPreviousBill(res.previousBill);
          }
          // Pre-fill invoice number if not manually edited by user
          setFormData(prev => {
            if (prev.isManualInvoiceNumber && prev.invoiceNumber) {
              return prev;
            }
            return {
              ...prev,
              invoiceNumber: res.invoiceNumber,
              autoAllocate: true
            };
          });
        }
      } catch (err) {
        console.warn('Could not peek next invoice number:', err.message);
      } finally {
        if (isMounted) setLoadingNumber(false);
      }
    }

    fetchNext();
    return () => { isMounted = false; };
  }, [formData.clientName, formData.customerName, formData.invoiceDate, isEditing]);

  // Handle clientName change (updates suggested invoiceNumber if not manually typed)
  const handleClientNameChange = (val) => {
    setFormData(prev => {
      const effective = val.trim();
      const currentFull = prev.invoiceNumber || previewNumber || '';
      const coreMatch = currentFull.match(/(\d{2,4}\/\d{1,2}\/\d{2,4})$/);
      const coreSeq = coreMatch ? coreMatch[1] : '';
      const syncd = coreSeq ? (effective ? `${effective} ${coreSeq}` : coreSeq) : currentFull;
      if (syncd && !isEditing) {
        setPreviewNumber(syncd);
      }
      return {
        ...prev,
        clientName: val,
        invoiceNumber: !prev.isManualInvoiceNumber && !isEditing && syncd ? syncd : prev.invoiceNumber
      };
    });
  };

  const handleCustomerNameChange = (val) => {
    setFormData(prev => {
      const effective = getEffectiveClientName(prev.clientName, val);
      const currentFull = prev.invoiceNumber || previewNumber || '';
      const coreMatch = currentFull.match(/(\d{2,4}\/\d{1,2}\/\d{2,4})$/);
      const coreSeq = coreMatch ? coreMatch[1] : '';
      const syncd = coreSeq ? (effective ? `${effective} ${coreSeq}` : coreSeq) : currentFull;
      if (syncd && !isEditing) {
        setPreviewNumber(syncd);
      }
      return {
        ...prev,
        customerName: val,
        invoiceNumber: !prev.isManualInvoiceNumber && !isEditing && syncd ? syncd : prev.invoiceNumber
      };
    });
  };

  // Financial Calculation State
  const [calculation, setCalculation] = useState(() => {
    return calculateInvoiceFinancials({
      quantity: formData.quantity,
      pricePerUnit: formData.pricePerUnit,
      cgstRate: formData.cgstRate,
      sgstRate: formData.sgstRate
    });
  });

  // Handle CV or Brokerage % change -> auto-update price per unit
  const handlePropertyPricingChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      const cv = Number(field === 'cvAmount' ? value : updated.cvAmount);
      const bPercent = Number(field === 'brokeragePercentage' ? value : updated.brokeragePercentage);

      if (cv > 0 && bPercent > 0) {
        const calculatedPrice = Math.round((cv * (bPercent / 100)) * 100) / 100;
        updated.pricePerUnit = calculatedPrice;
      }
      return updated;
    });
  };

  // Recalculate whenever quantity, price, or GST rates change
  useEffect(() => {
    const res = calculateInvoiceFinancials({
      quantity: formData.quantity,
      pricePerUnit: formData.pricePerUnit,
      cgstRate: formData.cgstRate,
      sgstRate: formData.sgstRate
    });
    setCalculation(res);
  }, [formData.quantity, formData.pricePerUnit, formData.cgstRate, formData.sgstRate]);

  // Auto-generate description if not manually edited
  useEffect(() => {
    if (!formData.isCustomDescription) {
      const desc = generateItemDescription({
        clientName: formData.clientName,
        projectName: formData.projectName,
        flatNumber: formData.flatNumber,
        brokeragePercentage: formData.brokeragePercentage,
        cvAmount: formData.cvAmount
      });
      setFormData(prev => ({ ...prev, itemDescription: desc }));
    }
  }, [
    formData.clientName,
    formData.projectName,
    formData.flatNumber,
    formData.brokeragePercentage,
    formData.cvAmount,
    formData.isCustomDescription
  ]);

  const handleApplyPresetNK = () => {
    setFormData(prev => ({
      ...prev,
      customerName: 'NK Realtors Private Limited',
      billingAddress: 'DN-52, PS Srijan Tech Park, Salt Lake, Sector V, Kolkata:-700091,\nWest Bengal',
      customerGstin: '19AABCN7336G1ZC',
      customerState: '19 – West Bengal'
    }));
  };

  const handleManualRegenerate = async () => {
    try {
      setLoadingNumber(true);
      const effectiveName = getEffectiveClientName(formData.clientName, formData.customerName);
      const res = await api.peekNextNumber(effectiveName, formData.invoiceDate, formData.customerName);
      if (res.success) {
        setFormData(prev => ({ ...prev, invoiceNumber: res.invoiceNumber, autoAllocate: true }));
        setPreviewNumber(res.invoiceNumber);
      }
    } catch (err) {
      console.warn('Manual regenerate error:', err);
    } finally {
      setLoadingNumber(false);
    }
  };

  const handleBankAccountSelect = (accountId) => {
    const chosen = availableBankAccounts.find(a => a.id === accountId);
    if (chosen) {
      setFormData(prev => ({
        ...prev,
        selectedBankAccountId: chosen.id,
        bankDetails: {
          accountId: chosen.id,
          bankName: chosen.bankName,
          accountNumber: chosen.accountNumber,
          ifsc: chosen.ifsc || chosen.ifscCode,
          ifscCode: chosen.ifscCode || chosen.ifsc,
          accountHolder: chosen.accountHolder || chosen.accountHolderName,
          accountHolderName: chosen.accountHolderName || chosen.accountHolder,
          branch: chosen.branch || ''
        }
      }));
    }
  };

  const buildCompleteInvoiceObject = () => {
    const finalCalculations = calculateInvoiceFinancials({
      quantity: formData.quantity,
      pricePerUnit: formData.pricePerUnit,
      cgstRate: formData.cgstRate,
      sgstRate: formData.sgstRate
    });

    const isManual = Boolean(formData.isManualInvoiceNumber);
    const invoiceId = formData._id || formData.id || initialInvoice?._id || initialInvoice?.id;

    return {
      ...formData,
      ...(invoiceId && { _id: invoiceId, id: invoiceId }),
      selectedBankAccountId: formData.selectedBankAccountId || 'account_1',
      bankDetails: formData.bankDetails,
      allocateNewNumber: !isEditing && !isManual && formData.autoAllocate,
      financials: finalCalculations,
      companySnapshot: { 
        ...companyDetails,
        bankName: formData.bankDetails?.bankName || companyDetails?.bankName,
        accountNumber: formData.bankDetails?.accountNumber || companyDetails?.accountNumber,
        ifsc: formData.bankDetails?.ifsc || companyDetails?.ifsc,
        accountHolder: formData.bankDetails?.accountHolder || companyDetails?.accountHolder
      }
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullInvoice = buildCompleteInvoiceObject();
    onSave(fullInvoice);
  };

  const handleSaveAndPreview = (e) => {
    e.preventDefault();
    const fullInvoice = buildCompleteInvoiceObject();
    onSaveAndPreview(fullInvoice);
  };

  return (
    <div className="invoice-form-container" style={{ maxWidth: '1080px', margin: '0 auto' }}>
      {/* Form Page Header */}
      <div className="card" style={{ padding: '1.5rem 1.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <FileText size={22} color="var(--gold-600)" />
              <span>{isEditing ? `Edit Invoice: ${formData.invoiceNumber}` : 'Create New Tax Invoice'}</span>
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginTop: '0.25rem' }}>
              Reference previous bill and enter or customize client name and invoice number: <code>Client Name + XXX/MM/YY</code>.
            </p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            padding: '0.75rem 1.25rem',
            boxShadow: '0 3px 12px rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '9px',
              background: '#d97706',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Previous Created Bill
              </div>
              <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#78350f', letterSpacing: '-0.01em', marginTop: '0.1rem' }}>
                {previousBill || (lastInvoice ? computePreviousBill(lastInvoice) : 'Aparajita Das 008/11/26')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* SECTION 1: INVOICE & SUPPLY DETAILS */}
        <div className="card">
          <div className="section-badge-header">
            <span className="section-number-pill">1</span>
            <span className="section-title-text">Invoice & Place of Supply</span>
          </div>

          <div className="form-grid">
            {/* Invoice Number */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label required">
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--slate-900)' }}>Invoice Number</span>
                <span style={{ fontSize: '0.78rem', color: '#b48528', fontWeight: 700, textTransform: 'none' }}>
                  (Manually enter or edit: Client Name XXX/MM/YY)
                </span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                <input
                  type="text"
                  required
                  value={formData.invoiceNumber || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    invoiceNumber: e.target.value,
                    isManualInvoiceNumber: true,
                    autoAllocate: false
                  }))}
                  placeholder="e.g. Aparajita Das 009/11/26"
                  className="form-input font-mono"
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    backgroundColor: '#ffffff',
                    color: 'var(--slate-900)',
                    border: '2px solid var(--slate-300)',
                    padding: '0.75rem 1rem'
                  }}
                  title="Manually enter or edit the client name and invoice number."
                />
                <button
                  type="button"
                  onClick={handleManualRegenerate}
                  className="btn btn-secondary"
                  title="Auto-fill next sequential number"
                  style={{ padding: '0.65rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  <RefreshCw size={15} className={loadingNumber ? 'spin' : ''} />
                  <span>Next Number</span>
                </button>
              </div>
              <span className="form-helper-text" style={{ color: 'var(--slate-600)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem', marginTop: '0.3rem' }}>
                <Sparkles size={14} color="#b48528" />
                <span>Format: <code>Client Name XXX/MM/YY</code>. You can customize the client name and sequential number directly.</span>
              </span>
            </div>

            {/* Invoice Date */}
            <div className="form-group">
              <label className="form-label required">Invoice Date</label>
              <div className="input-with-icon-wrapper">
                <span className="input-prefix-icon">
                  <Calendar size={16} />
                </span>
                <input
                  type="date"
                  required
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  className="form-input has-icon"
                />
              </div>
            </div>

            {/* Place of Supply */}
            <div className="form-group">
              <label className="form-label required">Place of Supply</label>
              <div className="input-with-icon-wrapper">
                <span className="input-prefix-icon">
                  <MapPin size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={formData.placeOfSupply}
                  onChange={(e) => setFormData({ ...formData, placeOfSupply: e.target.value })}
                  placeholder="19 – West Bengal"
                  className="form-input has-icon"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: CLIENT / DEVELOPER DETAILS (BILL TO) */}
        <div className="card">
          <div className="section-badge-header">
            <span className="section-number-pill">2</span>
            <span className="section-title-text">Bill To (Customer / Developer)</span>
          </div>

          {/* Quick preset bar */}
          <div className="quick-fill-bar">
            <span style={{ fontSize: '0.72rem', color: 'var(--slate-500)', fontWeight: 600 }}>Quick Presets:</span>
            <button
              type="button"
              onClick={handleApplyPresetNK}
              className="quick-fill-btn"
            >
              NK Realtors Private Limited
            </button>
          </div>

          <div className="form-grid">
            {/* Customer Name */}
            <div className="form-group col-span-2">
              <label className="form-label required">Customer / Company Name</label>
              <div className="input-with-icon-wrapper">
                <span className="input-prefix-icon">
                  <Building2 size={15} />
                </span>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  placeholder="e.g. NK Realtors Private Limited"
                  className="form-input has-icon"
                  style={{ fontWeight: 600 }}
                />
              </div>
            </div>

            {/* Customer GSTIN */}
            <div className="form-group">
              <label className="form-label required">Customer GSTIN</label>
              <div className="input-with-icon-wrapper">
                <span className="input-prefix-icon">
                  <Hash size={15} />
                </span>
                <input
                  type="text"
                  required
                  value={formData.customerGstin}
                  onChange={(e) => setFormData({ ...formData, customerGstin: e.target.value.toUpperCase() })}
                  placeholder="19AABCN7336G1ZC"
                  className="form-input has-icon font-mono"
                />
              </div>
            </div>

            {/* Customer State */}
            <div className="form-group">
              <label className="form-label required">Customer State</label>
              <input
                type="text"
                required
                value={formData.customerState}
                onChange={(e) => setFormData({ ...formData, customerState: e.target.value })}
                placeholder="19 – West Bengal"
                className="form-input"
              />
            </div>

            {/* Billing Address */}
            <div className="form-group col-span-full">
              <label className="form-label required">Billing Address</label>
              <textarea
                rows={2}
                required
                value={formData.billingAddress}
                onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                placeholder="DN-52, PS Srijan Tech Park, Salt Lake, Sector V, Kolkata:-700091, West Bengal"
                className="form-textarea"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: BROKERAGE & PROPERTY DETAILS */}
        <div className="card">
          <div className="section-badge-header">
            <span className="section-number-pill">3</span>
            <span className="section-title-text">Brokerage & Property Details</span>
          </div>

          <div className="form-grid">
            {/* Buyer / Client Name */}
            <div className="form-group">
              <label className="form-label required">Buyer / Client Name</label>
              <div className="input-with-icon-wrapper">
                <span className="input-prefix-icon">
                  <User size={15} />
                </span>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => handleClientNameChange(e.target.value)}
                  placeholder="e.g. Aparajita Das"
                  className="form-input has-icon"
                />
              </div>
            </div>

            {/* Project Name */}
            <div className="form-group">
              <label className="form-label required">Project Name</label>
              <div className="input-with-icon-wrapper">
                <span className="input-prefix-icon">
                  <Home size={15} />
                </span>
                <input
                  type="text"
                  required
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="e.g. Vayu"
                  className="form-input has-icon"
                />
              </div>
            </div>

            {/* Flat / Unit Number */}
            <div className="form-group">
              <label className="form-label required">Unit / Flat / Tower</label>
              <input
                type="text"
                required
                value={formData.flatNumber}
                onChange={(e) => setFormData({ ...formData, flatNumber: e.target.value })}
                placeholder="e.g. B12 (or Unit - B12, 2th Floor)"
                className="form-input"
              />
            </div>

            {/* Consideration Value (CV) */}
            <div className="form-group">
              <label className="form-label required">
                <span>Consideration Value (CV)</span>
                {formData.cvAmount > 0 && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--gold-600)', fontWeight: 600 }}>
                    ₹ {formatINR(formData.cvAmount)}
                  </span>
                )}
              </label>
              <div className="input-with-icon-wrapper">
                <span className="input-prefix-icon font-mono" style={{ fontWeight: 700 }}>₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={formData.cvAmount}
                  onChange={(e) => handlePropertyPricingChange('cvAmount', e.target.value)}
                  placeholder="5172400"
                  className="form-input has-icon font-mono"
                />
              </div>
            </div>

            {/* Brokerage Percentage */}
            <div className="form-group">
              <label className="form-label required">Brokerage Percentage (%)</label>
              <div className="input-with-icon-wrapper">
                <span className="input-prefix-icon">
                  <Percent size={14} />
                </span>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.brokeragePercentage}
                  onChange={(e) => handlePropertyPricingChange('brokeragePercentage', e.target.value)}
                  placeholder="2"
                  className="form-input has-icon font-mono"
                />
              </div>
            </div>

            {/* Calculated Brokerage Pill */}
            <div className="form-group" style={{ justifyContent: 'center' }}>
              <div style={{
                background: 'var(--gold-50)',
                border: '1px solid var(--gold-200)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--gold-700)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Auto Calculated Brokerage Fee:
                </span>
                <span className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gold-800)' }}>
                  ₹ {formatINR(formData.pricePerUnit)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: TAXABLE ITEM & GST CONFIGURATION */}
        <div className="card">
          <div className="section-badge-header">
            <span className="section-number-pill">4</span>
            <span className="section-title-text">Tax Invoice Item & GST Rates</span>
          </div>

          <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label required">HSN / SAC Code</label>
              <input
                type="text"
                required
                value={formData.hsnSac}
                onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
                placeholder="1164"
                className="form-input font-mono"
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Quantity</label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="form-input font-mono"
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Price / Unit (Taxable)</label>
              <div className="input-with-icon-wrapper">
                <span className="input-prefix-icon font-mono">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={formData.pricePerUnit}
                  onChange={(e) => setFormData({ ...formData, pricePerUnit: Number(e.target.value) })}
                  className="form-input has-icon font-mono"
                  style={{ fontWeight: 700 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">CGST Rate (%)</label>
              <input
                type="number"
                required
                min="0"
                max="50"
                step="0.5"
                value={formData.cgstRate}
                onChange={(e) => setFormData({ ...formData, cgstRate: Number(e.target.value) })}
                className="form-input font-mono"
              />
            </div>

            <div className="form-group">
              <label className="form-label required">SGST Rate (%)</label>
              <input
                type="number"
                required
                min="0"
                max="50"
                step="0.5"
                value={formData.sgstRate}
                onChange={(e) => setFormData({ ...formData, sgstRate: Number(e.target.value) })}
                className="form-input font-mono"
              />
            </div>
          </div>

          {/* Item Description Box */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label required" style={{ margin: 0 }}>Item Description (Printed on Invoice)</label>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isCustomDescription: !prev.isCustomDescription }))}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'var(--gold-600)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Edit2 size={12} />
                <span>{formData.isCustomDescription ? 'Reset to Auto-Generated' : 'Customize Description Manually'}</span>
              </button>
            </div>
            <textarea
              rows={2}
              required
              value={formData.itemDescription}
              onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value, isCustomDescription: true })}
              className="form-textarea font-mono"
              style={{ fontSize: '0.82rem' }}
            />
          </div>
        </div>

        {/* SECTION 5: BANK ACCOUNT DETAILS */}
        <div className="card">
          <div className="section-badge-header">
            <span className="section-number-pill">5</span>
            <span className="section-title-text">Bank Account Details</span>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginBottom: '1.25rem' }}>
            Choose which company bank account appears in the Bank Details section of the generated invoice PDF.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {availableBankAccounts.map((acc) => {
              const isSelected = formData.selectedBankAccountId === acc.id;
              return (
                <label
                  key={acc.id}
                  style={{
                    display: 'block',
                    cursor: 'pointer',
                    border: isSelected ? '2.5px solid #b48528' : '1.5px solid var(--slate-300)',
                    background: isSelected ? '#fffdf7' : '#ffffff',
                    boxShadow: isSelected ? '0 4px 16px rgba(180, 133, 40, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
                    borderRadius: '12px',
                    padding: '1.25rem 1.4rem',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <input
                        type="radio"
                        name="selectedBankAccountId"
                        value={acc.id}
                        checked={isSelected}
                        onChange={() => handleBankAccountSelect(acc.id)}
                        style={{ accentColor: '#b48528', width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: isSelected ? '#78350f' : 'var(--slate-900)' }}>
                        {acc.bankName}
                      </span>
                    </div>
                    {acc.isDefault ? (
                      <span className="badge badge-gold" style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem' }}>Account 1 (Default)</span>
                    ) : (
                      <span className="badge badge-secondary" style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem' }}>Account 2</span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.88rem', color: 'var(--slate-700)', lineHeight: 1.7, paddingLeft: '1.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Account Holder:</span>{' '}
                      <strong style={{ color: 'var(--slate-900)' }}>{acc.accountHolder || acc.accountHolderName}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Account Number:</span>{' '}
                      <strong className="font-mono" style={{ color: 'var(--slate-900)', fontSize: '1.02rem' }}>{acc.accountNumber}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>IFSC Code:</span>{' '}
                      <strong className="font-mono" style={{ color: 'var(--slate-900)', fontSize: '0.94rem' }}>{acc.ifsc || acc.ifscCode}</strong>
                    </div>
                    {acc.branch && (
                      <div>
                        <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Branch:</span> {acc.branch}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {/* Active selection summary pill */}
          <div style={{
            background: 'var(--slate-100)',
            border: '1.5px solid var(--slate-300)',
            borderRadius: '10px',
            padding: '0.95rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.65rem',
            fontSize: '0.92rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Landmark size={18} color="var(--gold-600)" />
              <span style={{ color: 'var(--slate-600)', fontWeight: 600 }}>Active on Invoice:</span>
              <strong style={{ color: 'var(--slate-900)', fontSize: '0.98rem' }}>
                {formData.bankDetails?.bankName || 'AU Small Finance Bank'}
              </strong>
              <span className="font-mono" style={{ color: 'var(--slate-600)', fontWeight: 700 }}>
                ({formData.bankDetails?.accountNumber})
              </span>
            </div>
            <span style={{ fontSize: '0.84rem', color: 'var(--slate-600)' }}>
              IFSC: <strong className="font-mono" style={{ color: 'var(--slate-900)' }}>{formData.bankDetails?.ifsc || formData.bankDetails?.ifscCode}</strong>
            </span>
          </div>
        </div>

        {/* REAL-TIME CALCULATOR PANEL */}
        <Calculator calculation={calculation} title="Live Real-time GST & Total Calculator" />

        {/* BOTTOM ACTION BUTTONS */}
        <div className="action-buttons">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.4rem' }}
          >
            <RotateCcw size={16} />
            <span>Cancel</span>
          </button>

          <button
            type="submit"
            className="btn btn-dark"
            style={{ padding: '0.75rem 1.6rem' }}
          >
            <Save size={18} />
            <span>Save & Issue to Database</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndPreview}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.85rem' }}
          >
            <Eye size={18} />
            <span>Issue & Preview A4 PDF</span>
          </button>
        </div>
      </form>
    </div>
  );
}
