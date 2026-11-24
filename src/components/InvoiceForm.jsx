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
  Edit2
} from 'lucide-react';
import { calculateInvoiceFinancials, generateItemDescription, formatINR } from '../utils/calculations';
import { api } from '../services/api';
import Calculator from './Calculator';

export default function InvoiceForm({ 
  initialInvoice = null, 
  companyDetails, 
  onSave, 
  onSaveAndPreview, 
  onCancel 
}) {
  const isEditing = Boolean(initialInvoice?._id || initialInvoice?.id);

  // Form State
  const [formData, setFormData] = useState(() => {
    if (initialInvoice) {
      return { ...initialInvoice };
    }
    const today = new Date().toISOString().slice(0, 10);
    return {
      // Invoice Details
      invoiceNumber: '',
      autoAllocate: true,
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
      sgstRate: companyDetails?.defaultSgstRate || 9
    };
  });

  const [previewNumber, setPreviewNumber] = useState('');
  const [loadingNumber, setLoadingNumber] = useState(false);

  // Fetch real-time preview of next number from backend
  useEffect(() => {
    let isMounted = true;
    async function fetchNext() {
      if (isEditing && formData.invoiceNumber) {
        setPreviewNumber(formData.invoiceNumber);
        return;
      }
      setLoadingNumber(true);
      try {
        const res = await api.peekNextNumber(formData.clientName, formData.invoiceDate);
        if (isMounted && res.success) {
          setPreviewNumber(res.invoiceNumber);
          if (!formData.invoiceNumber) {
            setFormData(prev => ({ ...prev, invoiceNumber: res.invoiceNumber }));
          }
        }
      } catch (err) {
        console.warn('Could not peek next invoice number:', err.message);
      } finally {
        if (isMounted) setLoadingNumber(false);
      }
    }
    fetchNext();
    return () => { isMounted = false; };
  }, [formData.clientName, formData.invoiceDate, isEditing]);

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
      const res = await api.peekNextNumber(formData.clientName, formData.invoiceDate);
      if (res.success) {
        setFormData(prev => ({ ...prev, invoiceNumber: res.invoiceNumber }));
        setPreviewNumber(res.invoiceNumber);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const buildCompleteInvoiceObject = () => {
    const finalCalculations = calculateInvoiceFinancials({
      quantity: formData.quantity,
      pricePerUnit: formData.pricePerUnit,
      cgstRate: formData.cgstRate,
      sgstRate: formData.sgstRate
    });

    return {
      ...formData,
      allocateNewNumber: !isEditing && formData.autoAllocate,
      financials: finalCalculations,
      companySnapshot: { ...companyDetails }
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
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="var(--gold-500)" />
              <span>{isEditing ? `Edit Invoice: ${formData.invoiceNumber}` : 'Create New Tax Invoice'}</span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
              Numbers are atomically allocated upon invoice issue: <code>Client Name + XXX/MM/YYYY</code>.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-gold">
              <span>Anticipated Number:</span>
              <strong className="font-mono">{loadingNumber ? 'Calculating...' : previewNumber || '—'}</strong>
            </span>
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
            <div className="form-group">
              <label className="form-label required">
                <span>Invoice Number</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--gold-600)', textTransform: 'none' }}>
                  Format: Client Name XXX/MM/YYYY
                </span>
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  required
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value, autoAllocate: false })}
                  placeholder="e.g. Aparajita Das 009/11/2026"
                  className="form-input font-mono"
                  style={{ fontWeight: 700 }}
                />
                <button
                  type="button"
                  onClick={handleManualRegenerate}
                  className="btn btn-secondary"
                  title="Refresh number from database counter"
                  style={{ padding: '0.5rem 0.75rem' }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              <span className="form-helper-text">
                {formData.autoAllocate ? 'Atomic sequence allocated upon issue.' : 'Custom number manually specified.'}
              </span>
            </div>

            {/* Invoice Date */}
            <div className="form-group">
              <label className="form-label required">Invoice Date</label>
              <div className="input-with-icon-wrapper">
                <span className="input-prefix-icon">
                  <Calendar size={15} />
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
                  <MapPin size={15} />
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
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
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

        {/* REAL-TIME CALCULATOR PANEL */}
        <Calculator calculation={calculation} title="Live Real-time GST & Total Calculator" />

        {/* BOTTOM ACTION BUTTONS */}
        <div className="action-buttons">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-dark"
          >
            <Save size={16} />
            <span>Save & Issue to MongoDB</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndPreview}
            className="btn btn-primary"
          >
            <Eye size={16} />
            <span>Issue & Preview A4 PDF</span>
          </button>
        </div>
      </form>
    </div>
  );
}
