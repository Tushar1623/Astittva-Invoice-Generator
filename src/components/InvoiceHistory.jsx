import React, { useState, useRef } from 'react';
import { 
  History, 
  Search, 
  Eye, 
  Edit3, 
  Copy, 
  Trash2, 
  Download, 
  Upload, 
  FileSpreadsheet,
  FileText,
  Calendar,
  Building,
  CheckCircle2,
  X,
  Printer
} from 'lucide-react';
import { formatINR } from '../utils/calculations';
import { downloadInvoicePDF } from '../utils/pdfGenerator';

export default function InvoiceHistory({ 
  invoices = [], 
  onViewInvoice, 
  onEditInvoice, 
  onDuplicateInvoice, 
  onDeleteInvoice,
  onImportBackup 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedNumber, setCopiedNumber] = useState(null);
  const fileInputRef = useRef(null);

  const filteredInvoices = invoices.filter(inv => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.customerName?.toLowerCase().includes(q) ||
      inv.clientName?.toLowerCase().includes(q) ||
      inv.projectName?.toLowerCase().includes(q) ||
      inv.customerGstin?.toLowerCase().includes(q)
    );
  });

  const totalValue = filteredInvoices.reduce((sum, inv) => sum + (inv.financials?.finalTotal || 0), 0);

  // Export JSON Backup
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(invoices, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `astittva_invoices_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON Backup
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          onImportBackup(parsed);
          alert(`Successfully imported ${parsed.length} invoices!`);
        } else {
          alert('Invalid backup format: expected an array of invoices.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset input
  };

  const handleCopyNumber = (num, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 1800);
  };

  return (
    <div className="history-container">
      {/* Header and Backup Controls */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="card-title-icon-badge">
              <History size={18} />
            </div>
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>Invoice Records & History</h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                {invoices.length} total invoices saved in browser LocalStorage
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handleExportJSON} 
              className="btn btn-secondary" 
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
              title="Download all invoice records as JSON backup"
            >
              <Download size={14} />
              <span>Export JSON Backup</span>
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="btn btn-secondary" 
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
              title="Restore invoice records from JSON file"
            >
              <Upload size={14} />
              <span>Restore Backup</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportFile} 
              accept=".json" 
              style={{ display: 'none' }} 
            />
          </div>
        </div>

        {/* Filter and Summary Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice number, customer, buyer, or project..."
              className="form-input has-icon"
              style={{ fontSize: '0.82rem', paddingRight: searchTerm ? '30px' : '10px' }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--slate-500)' }}>
              Showing: <strong style={{ color: 'var(--slate-900)' }}>{filteredInvoices.length}</strong> records
            </span>
            <span style={{ color: 'var(--slate-500)' }}>
              Total Filtered: <strong className="font-mono" style={{ color: 'var(--slate-900)' }}>₹ {formatINR(totalValue)}</strong>
            </span>
          </div>
        </div>

        {/* Invoices Table */}
        {filteredInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--slate-500)' }}>
            <FileText size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
            <h4 style={{ fontWeight: 700, color: 'var(--slate-800)', fontSize: '1rem' }}>No Invoice Records Found</h4>
            <p style={{ fontSize: '0.82rem', marginTop: '0.25rem', maxWidth: '360px', margin: '0.25rem auto 0' }}>
              {searchTerm ? 'No invoices matched your current search filters.' : 'Generated invoices are permanently recorded and stored here.'}
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
                  <th>GSTIN</th>
                  <th>Buyer / Property</th>
                  <th style={{ textAlign: 'right' }}>Taxable Base</th>
                  <th style={{ textAlign: 'right' }}>Total (INR)</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="badge badge-gold font-mono" style={{ fontWeight: 700, fontSize: '0.8rem' }}>
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
                            padding: '2px'
                          }}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--slate-600)', fontSize: '0.8rem' }}>
                        <Calendar size={13} color="var(--slate-400)" />
                        <span>{inv.invoiceDate ? inv.invoiceDate.split('-').reverse().join('-') : '—'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{inv.customerName}</div>
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--slate-600)' }}>
                        {inv.customerGstin || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{inv.clientName || '—'}</span>
                        {inv.projectName && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>
                            {inv.projectName} {inv.flatNumber ? `• Unit ${inv.flatNumber}` : ''}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono">
                      <span style={{ color: 'var(--slate-600)' }}>
                        ₹ {formatINR(inv.financials?.taxableAmount || 0)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono">
                      <span style={{ fontWeight: 800, color: 'var(--slate-900)', fontSize: '0.9rem' }}>
                        ₹ {formatINR(inv.financials?.finalTotal || 0)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="btn-icon-only"
                          title="Preview & Print A4 PDF"
                        >
                          <Eye size={15} color="var(--slate-600)" />
                        </button>

                        <button
                          onClick={() => onEditInvoice(inv)}
                          className="btn-icon-only"
                          title="Edit Invoice"
                        >
                          <Edit3 size={15} color="var(--slate-600)" />
                        </button>

                        <button
                          onClick={() => onDuplicateInvoice(inv)}
                          className="btn-icon-only"
                          title="Duplicate as New Invoice"
                        >
                          <Copy size={15} color="var(--slate-600)" />
                        </button>

                        <button
                          onClick={() => onDeleteInvoice(inv.id)}
                          className="btn-icon-only"
                          title="Delete Invoice"
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={15} />
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
