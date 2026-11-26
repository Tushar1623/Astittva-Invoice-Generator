import React, { useState } from 'react';
import { 
  PlusCircle, 
  Search, 
  FileText, 
  TrendingUp, 
  Clock, 
  Eye, 
  Download, 
  Edit3, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  Sparkles, 
  Percent, 
  ShieldCheck, 
  UploadCloud, 
  X,
  Filter
} from 'lucide-react';
import { formatINR } from '../utils/calculations';

export default function Dashboard({ 
  invoices = [], 
  companyDetails, 
  onCreateNew, 
  onViewInvoice, 
  onEditInvoice, 
  onDuplicateInvoice, 
  onDeleteInvoice, 
  onOpenSettings,
  onOpenImport 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [copiedNumber, setCopiedNumber] = useState(null);

  // Calculations for KPI Cards
  const totalInvoices = invoices.length;
  const latestInvoice = invoices.length > 0 ? invoices[0].invoiceNumber : 'None';
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.financials?.finalTotal || 0), 0);
  const totalTaxable = invoices.reduce((sum, inv) => sum + (inv.financials?.taxableAmount || 0), 0);
  const totalGST = invoices.reduce((sum, inv) => {
    const cgst = inv.financials?.cgstAmount || 0;
    const sgst = inv.financials?.sgstAmount || 0;
    return sum + cgst + sgst;
  }, 0);

  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => {
    // 1. Search filter
    const q = searchTerm.toLowerCase().trim();
    const matchSearch = !q || (
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.customerName?.toLowerCase().includes(q) ||
      inv.clientName?.toLowerCase().includes(q) ||
      inv.projectName?.toLowerCase().includes(q) ||
      inv.customerGstin?.toLowerCase().includes(q)
    );

    // 2. Month filter
    let matchMonth = true;
    if (selectedMonth) {
      matchMonth = String(inv.month) === String(selectedMonth);
    }

    // 3. Year filter
    let matchYear = true;
    if (selectedYear) {
      matchYear = String(inv.year) === String(selectedYear);
    }

    return matchSearch && matchMonth && matchYear;
  });

  const handleCopyNumber = (num, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 1800);
  };

  return (
    <div className="dashboard-container">
      {/* Top Hero Banner */}
      <div className="dashboard-hero-card">
        <div className="hero-content-row">
          <div className="hero-left">
            <h2>
              <Building2 size={24} color="#cca038" />
              <span>ASTITTVA MARKETING Pvt Ltd</span>
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Tax Invoice Generation & Brokerage Billing System backed by MongoDB Atlas.
            </p>
            <div className="hero-meta-row">
              <span className="hero-meta-pill">
                GSTIN: <strong>{companyDetails?.gstin || '19ABFCA7189M1ZV'}</strong>
              </span>
              <span className="hero-meta-pill">
                State: <strong>{companyDetails?.state || '19 – West Bengal'}</strong>
              </span>
              <span className="hero-meta-pill">
                RERA: <strong>{companyDetails?.rera || 'WBRERA/A/NOR/2026/001132'}</strong>
              </span>
              <span className="hero-meta-pill">
                Bank: <strong>{companyDetails?.bankName || 'AU Small Finance Bank'}</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={onOpenImport} 
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.15rem', fontSize: '0.86rem', background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <UploadCloud size={17} color="var(--gold-400)" />
              <span>Import Receipts</span>
            </button>

            <button 
              onClick={onCreateNew} 
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.4rem', fontSize: '0.9rem' }}
            >
              <PlusCircle size={18} />
              <span>Generate New Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="kpi-grid">
        {/* KPI 1: Total Invoices */}
        <div className="kpi-card">
          <div>
            <div className="kpi-top-row">
              <span className="kpi-label" style={{ fontSize: '0.8rem', color: 'var(--slate-600)', fontWeight: 800 }}>Invoices Issued</span>
              <div className="kpi-icon-box gold">
                <FileText size={22} />
              </div>
            </div>
            <div className="kpi-value-row">
              <span className="kpi-value" style={{ fontSize: '1.9rem', fontWeight: 800 }}>{totalInvoices}</span>
              <span style={{ fontSize: '0.88rem', color: 'var(--slate-500)', fontWeight: 700 }}>records</span>
            </div>
          </div>
          <div className="kpi-subtext" style={{ fontSize: '0.82rem' }}>
            <CheckCircle2 size={15} color="var(--success)" />
            <span>MongoDB Atlas Persistent Storage</span>
          </div>
        </div>

        {/* KPI 2: Latest Invoice */}
        <div className="kpi-card">
          <div>
            <div className="kpi-top-row">
              <span className="kpi-label" style={{ fontSize: '0.8rem', color: 'var(--slate-600)', fontWeight: 800 }}>Latest Invoice #</span>
              <div className="kpi-icon-box blue">
                <Clock size={22} />
              </div>
            </div>
            <div className="kpi-value-row" style={{ overflow: 'hidden' }}>
              <span className="kpi-value font-mono" style={{ color: 'var(--gold-700)', fontSize: '1.25rem', fontWeight: 800, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {latestInvoice}
              </span>
              {latestInvoice !== 'None' && (
                <button
                  onClick={(e) => handleCopyNumber(latestInvoice, e)}
                  title="Copy Invoice Number"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: copiedNumber === latestInvoice ? 'var(--success)' : 'var(--slate-500)',
                    padding: '4px',
                    flexShrink: 0
                  }}
                >
                  <Copy size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="kpi-subtext" style={{ fontSize: '0.82rem' }}>
            <span>{copiedNumber === latestInvoice ? 'Copied to clipboard!' : 'Global monthly atomic counter'}</span>
          </div>
        </div>

        {/* KPI 3: Total Invoiced Value */}
        <div className="kpi-card">
          <div>
            <div className="kpi-top-row">
              <span className="kpi-label" style={{ fontSize: '0.8rem', color: 'var(--slate-600)', fontWeight: 800 }}>Total Invoiced Amount</span>
              <div className="kpi-icon-box green">
                <TrendingUp size={22} />
              </div>
            </div>
            <div className="kpi-value-row">
              <span className="kpi-value font-mono" style={{ fontSize: '1.85rem', fontWeight: 800 }}>
                ₹ {formatINR(totalAmount)}
              </span>
            </div>
          </div>
          <div className="kpi-subtext" style={{ fontSize: '0.82rem' }}>
            <Sparkles size={14} color="var(--gold-600)" />
            <span>Base Taxable: ₹ {formatINR(totalTaxable)}</span>
          </div>
        </div>

        {/* KPI 4: GST Collected */}
        <div className="kpi-card">
          <div>
            <div className="kpi-top-row">
              <span className="kpi-label" style={{ fontSize: '0.8rem', color: 'var(--slate-600)', fontWeight: 800 }}>Total GST Processed</span>
              <div className="kpi-icon-box purple">
                <Percent size={20} />
              </div>
            </div>
            <div className="kpi-value-row">
              <span className="kpi-value font-mono" style={{ color: '#6d28d9', fontSize: '1.85rem', fontWeight: 800 }}>
                ₹ {formatINR(totalGST)}
              </span>
            </div>
          </div>
          <div className="kpi-subtext" style={{ fontSize: '0.82rem' }}>
            <ShieldCheck size={15} color="#7c3aed" />
            <span>9% CGST + 9% SGST breakdown</span>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table Card */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="card-title-icon-badge">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>Tax Invoices & Records</h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                Showing {filteredInvoices.length} of {invoices.length} total invoice records
              </span>
            </div>
          </div>

          {/* Search & Month/Year Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="form-select"
              style={{ width: '130px', fontSize: '0.8rem', padding: '0.5rem 0.65rem' }}
            >
              <option value="">All Months</option>
              <option value="1">01 - January</option>
              <option value="2">02 - February</option>
              <option value="3">03 - March</option>
              <option value="4">04 - April</option>
              <option value="5">05 - May</option>
              <option value="6">06 - June</option>
              <option value="7">07 - July</option>
              <option value="8">08 - August</option>
              <option value="9">09 - September</option>
              <option value="10">10 - October</option>
              <option value="11">11 - November</option>
              <option value="12">12 - December</option>
            </select>

            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="form-select"
              style={{ width: '105px', fontSize: '0.8rem', padding: '0.5rem 0.65rem' }}
            >
              <option value="">All Years</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search number, client, project..."
                className="form-input has-icon"
                style={{ fontSize: '0.8rem', paddingRight: searchTerm ? '28px' : '10px', paddingLeft: '32px' }}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--slate-500)' }}>
            <FileText size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
            <h4 style={{ fontWeight: 700, color: 'var(--slate-800)', fontSize: '0.95rem' }}>No Invoices Match Current Filter</h4>
            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
              {searchTerm || selectedMonth || selectedYear ? 'Try clearing your search or month/year filters.' : 'Issue your first invoice to get started.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Customer (Bill To)</th>
                  <th>Buyer & Project</th>
                  <th style={{ textAlign: 'right' }}>Taxable Base</th>
                  <th style={{ textAlign: 'right' }}>Total (INR)</th>
                  <th>Source</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv._id || inv.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span className="badge badge-gold font-mono" style={{ fontWeight: 800, fontSize: '0.88rem', padding: '0.35rem 0.65rem' }}>
                          {inv.invoiceNumber}
                        </span>
                        <button
                          onClick={(e) => handleCopyNumber(inv.invoiceNumber, e)}
                          title="Copy Invoice Number"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: copiedNumber === inv.invoiceNumber ? 'var(--success)' : 'var(--slate-400)',
                            padding: '3px'
                          }}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--slate-700)', fontSize: '0.88rem', fontWeight: 600 }}>
                        <Calendar size={14} color="var(--slate-400)" />
                        <span>{inv.invoiceDate ? inv.invoiceDate.split('-').reverse().join('-') : '—'}</span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--slate-900)', fontSize: '0.94rem' }}>{inv.customerName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', fontFamily: 'JetBrains Mono', marginTop: '0.1rem' }}>
                          {inv.customerGstin ? `GSTIN: ${inv.customerGstin}` : 'No GSTIN'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.88rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{inv.clientName || '—'}</span>
                        {inv.projectName && (
                          <div style={{ color: 'var(--slate-500)', fontSize: '0.8rem', marginTop: '0.1rem' }}>
                            {inv.projectName} {inv.flatNumber ? `• ${inv.flatNumber}` : ''}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono">
                      <span style={{ color: 'var(--slate-700)', fontSize: '0.92rem', fontWeight: 600 }}>
                        ₹ {formatINR(inv.financials?.taxableAmount || 0)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono">
                      <span style={{ fontWeight: 800, color: 'var(--slate-900)', fontSize: '1.02rem' }}>
                        ₹ {formatINR(inv.financials?.finalTotal || 0)}
                      </span>
                    </td>
                    <td>
                      {inv.isImported ? (
                        <span className="badge" style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', fontWeight: 700, fontSize: '0.76rem' }}>
                          Imported Receipt
                        </span>
                      ) : inv.isHistoricalMigration ? (
                        <span className="badge" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontWeight: 700, fontSize: '0.76rem' }}>
                          Migrated Record
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ fontWeight: 700, fontSize: '0.76rem' }}>
                          <span className="status-dot"></span>
                          <span>Issued</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="btn-icon-only"
                          title="Preview & Print Invoice"
                          style={{ padding: '0.5rem' }}
                        >
                          <Eye size={17} color="var(--slate-700)" />
                        </button>

                        <button
                          onClick={() => onEditInvoice(inv)}
                          className="btn-icon-only"
                          title="Edit Invoice"
                          style={{ padding: '0.5rem' }}
                        >
                          <Edit3 size={17} color="var(--slate-700)" />
                        </button>

                        <button
                          onClick={() => onDuplicateInvoice(inv)}
                          className="btn-icon-only"
                          title="Duplicate as New Invoice"
                          style={{ padding: '0.5rem' }}
                        >
                          <Copy size={17} color="var(--slate-700)" />
                        </button>

                        <button
                          onClick={() => onDeleteInvoice(inv)}
                          className="btn-icon-only"
                          title="Move to Trash"
                          style={{ padding: '0.5rem' }}
                        >
                          <Trash2 size={17} color="var(--danger)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
