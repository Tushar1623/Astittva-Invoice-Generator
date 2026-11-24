import React, { useState } from 'react';
import { Download, Printer, ArrowLeft, Edit3, CheckCircle, FileText, Share2, Sparkles } from 'lucide-react';
import { formatINR } from '../utils/calculations';
import { numberToWords } from '../utils/numberToWords';
import { downloadInvoicePDF, printInvoice } from '../utils/pdfGenerator';

export default function InvoicePreview({ invoice, companyDetails, onEdit, onBack }) {
  if (!invoice) return null;

  const [downloading, setDownloading] = useState(false);
  const comp = invoice.companySnapshot || companyDetails;
  const calc = invoice.financials;
  const words = numberToWords(calc.finalTotal);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadInvoicePDF('invoice-printable-area', invoice.invoiceNumber);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Top Action Bar */}
      <div className="card no-print" style={{ marginBottom: '1.25rem', padding: '0.95rem 1.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {onBack && (
              <button 
                onClick={onBack} 
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              >
                <ArrowLeft size={15} />
                <span>Back</span>
              </button>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--slate-900)' }}>
                  Tax Invoice: <span className="font-mono" style={{ color: 'var(--gold-600)' }}>{invoice.invoiceNumber}</span>
                </span>
                <span className="badge badge-success">
                  <span className="status-dot"></span>
                  <span>Issued</span>
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                {invoice.customerName} • {invoice.invoiceDate ? invoice.invoiceDate.split('-').reverse().join('-') : ''}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {onEdit && (
              <button 
                onClick={() => onEdit(invoice)} 
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem' }}
              >
                <Edit3 size={15} />
                <span>Edit</span>
              </button>
            )}

            <button 
              onClick={printInvoice} 
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem' }}
            >
              <Printer size={15} />
              <span>Print</span>
            </button>

            <button 
              onClick={handleDownload} 
              className="btn btn-primary"
              disabled={downloading}
              style={{ fontSize: '0.82rem' }}
            >
              <Download size={15} />
              <span>{downloading ? 'Generating PDF...' : 'Download A4 PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Invoice Container (Strict layout for pixel-perfect PDF rendering) */}
      <div className="invoice-wrapper">
        <div id="invoice-printable-area" className="invoice-doc">
          
          <div className="doc-top-title">Tax Invoice</div>

          <div className="doc-bordered-box">
            
            {/* Header: Logo and Company Info */}
            <div className="doc-header-row">
              <div className="doc-header-logo">
                <img src={comp.logoUrl || '/logo.png'} alt="ASTITTVA Logo" />
              </div>
              <div className="doc-company-info">
                <div className="doc-company-name">{comp.companyName}</div>
                <div className="doc-company-line">{comp.address}</div>
                {comp.rera && <div className="doc-company-line">{comp.rera}</div>}
                <div className="doc-company-line">Phone no.: {comp.phone} &nbsp; Email: {comp.email}</div>
                <div className="doc-company-line">GSTIN: {comp.gstin} &nbsp; State: {comp.state}</div>
              </div>
            </div>

            {/* Bill To and Invoice Details Row */}
            <div className="doc-split-row">
              <div className="doc-split-col">
                <div className="doc-bar">Bill To</div>
                <div className="doc-split-body">
                  <div className="doc-client-name">{invoice.customerName}</div>
                  <div style={{ whiteSpace: 'pre-line', marginBottom: '3px' }}>{invoice.billingAddress}</div>
                  <div>GSTIN : {invoice.customerGstin || '—'}</div>
                  <div>State: {invoice.customerState || comp.state}</div>
                </div>
              </div>

              <div className="doc-split-col">
                <div className="doc-bar">Invoice Details</div>
                <div className="doc-split-body">
                  <div style={{ marginBottom: '4px' }}>
                    Invoice No. : <b>{invoice.invoiceNumber}</b>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    Date : <b>{invoice.invoiceDate ? invoice.invoiceDate.split('-').reverse().join('-') : ''}</b>
                  </div>
                  <div>
                    Place of supply: <b>{invoice.placeOfSupply || comp.state}</b>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>#</th>
                  <th style={{ width: '31%', textAlign: 'left' }}>Item name</th>
                  <th style={{ width: '9%' }}>HSN/ SAC</th>
                  <th style={{ width: '7%' }}>Quantity</th>
                  <th style={{ width: '11%', textAlign: 'right' }}>Price/ Unit</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Taxable amount</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>CGST</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>SGST</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-center">1</td>
                  <td>
                    <div className="doc-desc">{invoice.itemDescription}</div>
                  </td>
                  <td className="text-center">{invoice.hsnSac || '1164'}</td>
                  <td className="text-center">{invoice.quantity || 1}</td>
                  <td className="text-right">₹ {formatINR(calc.pricePerUnit)}</td>
                  <td className="text-right">₹ {formatINR(calc.taxableAmount)}</td>
                  <td className="text-right">
                    <div>₹ {formatINR(calc.cgstAmount)}</div>
                    <span className="doc-subrate">({calc.cgstRate}%)</span>
                  </td>
                  <td className="text-right">
                    <div>₹ {formatINR(calc.sgstAmount)}</div>
                    <span className="doc-subrate">({calc.sgstRate}%)</span>
                  </td>
                  <td className="text-right">
                    <b>₹ {formatINR(calc.subtotal)}</b>
                  </td>
                </tr>

                {/* Total Row */}
                <tr style={{ borderTop: '1px solid #333333', fontWeight: 'bold' }}>
                  <td colSpan={2} style={{ textAlign: 'left', padding: '6px 8px' }}>Total</td>
                  <td></td>
                  <td className="text-center">{invoice.quantity || 1}</td>
                  <td></td>
                  <td className="text-right">₹ {formatINR(calc.taxableAmount)}</td>
                  <td className="text-right">₹ {formatINR(calc.cgstAmount)}</td>
                  <td className="text-right">₹ {formatINR(calc.sgstAmount)}</td>
                  <td className="text-right">₹ {formatINR(calc.subtotal)}</td>
                </tr>
              </tbody>
            </table>

            {/* Tax Breakdown & Final Totals Split Row */}
            <div className="doc-summary-row">
              {/* Left Column: Tax Type Breakdown */}
              <div className="doc-tax-col">
                <table className="doc-inner-table">
                  <thead>
                    <tr>
                      <th>Tax type</th>
                      <th className="text-right">Taxable amount</th>
                      <th className="text-right">Rate</th>
                      <th className="text-right">Tax amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>CGST</td>
                      <td className="text-right">₹ {formatINR(calc.taxableAmount)}</td>
                      <td className="text-right">{calc.cgstRate}%</td>
                      <td className="text-right">₹ {formatINR(calc.cgstAmount)}</td>
                    </tr>
                    <tr>
                      <td>SGST</td>
                      <td className="text-right">₹ {formatINR(calc.taxableAmount)}</td>
                      <td className="text-right">{calc.sgstRate}%</td>
                      <td className="text-right">₹ {formatINR(calc.sgstAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Right Column: Subtotal, Round-off, Final Total */}
              <div className="doc-amounts-col">
                <table className="doc-inner-table">
                  <tbody>
                    <tr>
                      <td>Subtotal</td>
                      <td className="text-right font-mono">₹ {formatINR(calc.subtotal)}</td>
                    </tr>
                    <tr>
                      <td>Round off</td>
                      <td className="text-right font-mono">
                        {calc.roundOff < 0 ? `- ₹ ${Math.abs(calc.roundOff).toFixed(2)}` : `₹ ${calc.roundOff.toFixed(2)}`}
                      </td>
                    </tr>
                    <tr className="total-highlight">
                      <td>Total</td>
                      <td className="text-right font-mono">₹ {formatINR(calc.finalTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Section: Words, Bank Details, and Signatory */}
            <div className="doc-bottom-row">
              <div className="doc-bottom-left">
                <div className="doc-bar">Invoice Amount In Words</div>
                <div className="doc-words-content">
                  {words}
                </div>

                <div className="doc-bar">Bank Details</div>
                <div className="doc-bank-content">
                  <div><b>Bank Name :</b> {comp.bankName}</div>
                  <div><b>Account No. :</b> {comp.accountNumber}</div>
                  <div><b>IFSC :</b> {comp.ifsc}</div>
                  <div><b>Account Holder :</b> {comp.accountHolder}</div>
                </div>
              </div>

              <div className="doc-bottom-right">
                <div className="doc-for-company">For {comp.companyName}</div>
                <div className="doc-signatory">Authorised Signatory</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
