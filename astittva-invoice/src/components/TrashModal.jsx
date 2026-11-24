import React, { useState, useEffect } from 'react';
import { X, Trash2, RotateCcw, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/calculations';

export default function TrashModal({ isOpen, onClose, onRestoreSuccess, onDeleteSuccess }) {
  const [trashList, setTrashList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadTrash();
    }
  }, [isOpen]);

  const loadTrash = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getInvoices({ status: 'trash' });
      if (res.success) {
        setTrashList(res.invoices);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleRestore = async (id, invoiceNumber) => {
    try {
      const res = await api.restoreInvoice(id);
      if (res.success) {
        setTrashList(prev => prev.filter(i => i._id !== id));
        if (onRestoreSuccess) onRestoreSuccess(invoiceNumber);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePermanentDelete = async (id, invoiceNumber) => {
    if (!window.confirm(`Are you sure you want to permanently delete invoice ${invoiceNumber}?\n\nNOTE: The database enforces a minimum retention of at least two invoice records at all times.`)) {
      return;
    }

    try {
      const res = await api.permanentDeleteInvoice(id);
      if (res.success) {
        setTrashList(prev => prev.filter(i => i._id !== id));
        if (onDeleteSuccess) onDeleteSuccess(invoiceNumber);
      }
    } catch (err) {
      setError(err.message);
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
      zIndex: 110,
      padding: '1.25rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        maxWidth: '750px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
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
              <Trash2 size={20} color="var(--danger)" />
              <span>Invoice Trash Management</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: '0.15rem' }}>
              Restore soft-deleted invoices or permanently purge records (requires administrator privileges).
            </p>
          </div>
          <button onClick={onClose} className="btn-icon-only" style={{ borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.75rem' }}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1px solid #fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {trashList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--slate-500)' }}>
              <Trash2 size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
              <h4 style={{ fontWeight: 700, color: 'var(--slate-800)', fontSize: '0.95rem' }}>Trash is Empty</h4>
              <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>No invoices are currently in the trash.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer / Client</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Total (INR)</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trashList.map((inv) => (
                    <tr key={inv._id}>
                      <td className="font-mono" style={{ fontWeight: 700 }}>
                        {inv.invoiceNumber}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{inv.customerName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{inv.clientName || '—'}</div>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {inv.invoiceDate || '—'}
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono">
                        ₹ {formatINR(inv.financials?.finalTotal || 0)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleRestore(inv._id, inv.invoiceNumber)}
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                            title="Restore invoice to active list"
                          >
                            <RotateCcw size={13} color="var(--success)" />
                            <span>Restore</span>
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(inv._id, inv.invoiceNumber)}
                            className="btn btn-danger"
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                            title="Permanently remove from MongoDB"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
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
    </div>
  );
}
