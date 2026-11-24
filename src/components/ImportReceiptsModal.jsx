import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  ExternalLink, 
  Sparkles, 
  Check, 
  RefreshCw,
  Building,
  Calendar,
  User,
  Hash,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { formatINR } from '../utils/calculations';

export default function ImportReceiptsModal({ isOpen, onClose, onImportSuccess }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [importsList, setImportsList] = useState([]);
  const [activeReviewItem, setActiveReviewItem] = useState(null);
  const [reviewFormData, setReviewFormData] = useState({});
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadImports();
    }
  }, [isOpen]);

  const loadImports = async () => {
    try {
      const res = await api.getImports();
      if (res.success) {
        setImportsList(res.imports);
      }
    } catch (err) {
      console.warn('Could not load existing imports:', err.message);
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = async (force = false) => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const res = await api.uploadReceipts(formData, force);
      if (res.success) {
        const newItems = res.newImports || [];
        const duplicates = res.duplicates || [];

        await loadImports();

        if (newItems.length > 0 && duplicates.length === 0) {
          setMessage({
            type: 'success',
            text: `Successfully uploaded and extracted ${newItems.length} receipt(s)! Review details below.`
          });
          // Automatically open first new item for review
          handleStartReview(newItems[0]);
        } else if (newItems.length > 0 && duplicates.length > 0) {
          setMessage({
            type: 'warning',
            text: `Uploaded ${newItems.length} receipt(s). ${duplicates.length} duplicate file(s) skipped.`
          });
          handleStartReview(newItems[0]);
        } else if (duplicates.length > 0) {
          const dup = duplicates[0];
          const invInfo = dup.existingInvoiceNumber ? ` as Invoice "${dup.existingInvoiceNumber}"` : '';
          setMessage({
            type: 'warning',
            text: `Duplicate file detected: "${dup.filename}" was already uploaded previously${invInfo}.`,
            isDuplicate: true,
            duplicateItem: dup
          });

          // If the duplicate item exists in imports list, open review or preview
          const existingInList = importsList.find(i => String(i._id) === String(dup.existingImportId));
          if (existingInList) {
            handleStartReview(existingInList);
          }
        } else {
          setMessage({
            type: 'success',
            text: `Processed ${res.count} file(s).`
          });
        }

        if (newItems.length > 0 || duplicates.length === 0) {
          setSelectedFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveSelectedFile = (indexToRemove) => {
    setSelectedFiles(selectedFiles.filter((_, idx) => idx !== indexToRemove));
    if (selectedFiles.length <= 1 && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartReview = (item) => {
    setActiveReviewItem(item);
    const ext = item.extractedData || {};
    setReviewFormData({
      invoiceNumber: ext.invoiceNumber || '',
      clientName: ext.clientName || '',
      invoiceDate: ext.invoiceDate || new Date().toISOString().slice(0, 10),
      customerName: ext.customerName || 'NK Realtors Private Limited',
      projectName: ext.projectName || '',
      flatNumber: ext.flatNumber || '',
      taxableAmount: ext.taxableAmount || 103448,
      cvAmount: 5172400,
      brokeragePercentage: 2,
      hsnSac: '1164',
      quantity: 1,
      cgstRate: 9,
      sgstRate: 9
    });
  };

  const handleCommitVerification = async () => {
    if (!activeReviewItem) return;
    setVerifying(true);
    try {
      const res = await api.verifyImport(activeReviewItem._id, reviewFormData);
      if (res.success) {
        setMessage({
          type: 'success',
          text: `Successfully verified and recorded invoice "${res.invoice.invoiceNumber}" in MongoDB Atlas!`
        });
        setActiveReviewItem(null);
        await loadImports();
        if (onImportSuccess) onImportSuccess(res.invoice);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveImport = async (item) => {
    const isVerified = item.status === 'verified';
    const invoiceNum = item.verifiedInvoiceNumber || item.extractedData?.invoiceNumber || 'this invoice';

    const confirmPrompt = isVerified
      ? `This receipt was verified and saved as invoice "${invoiceNum}".\n\nRemoving it will move the invoice to the Deleted / Trash section (soft deletion) while preserving original receipt files and audit history.\n\nDo you want to proceed with removal?`
      : `Are you sure you want to remove "${item.originalFilename}" from the import queue?`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      const res = await api.deleteImport(item._id);
      if (res.success) {
        setMessage({
          type: 'success',
          text: res.message
        });
        if (activeReviewItem?._id === item._id) {
          setActiveReviewItem(null);
        }
        await loadImports();
        if (onImportSuccess) {
          onImportSuccess();
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
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
        maxWidth: '850px',
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
              <UploadCloud size={22} color="var(--gold-500)" />
              <span>Import Existing Invoices & Receipts</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: '0.15rem' }}>
              Upload PDF, JPG, JPEG, and PNG receipt files. Extracted data is verified before saving to MongoDB Atlas.
            </p>
          </div>
          <button onClick={onClose} className="btn-icon-only" style={{ borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.75rem' }}>
          {/* Notification Banner */}
          {message && (
            <div style={{
              padding: '0.85rem 1.1rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              background: message.type === 'error' 
                ? 'var(--danger-bg)' 
                : message.type === 'warning' 
                  ? '#fffbeb' 
                  : 'var(--success-bg)',
              color: message.type === 'error' 
                ? 'var(--danger)' 
                : message.type === 'warning' 
                  ? '#92400e' 
                  : '#065f46',
              border: `1px solid ${
                message.type === 'error' 
                  ? '#fca5a5' 
                  : message.type === 'warning' 
                    ? '#fcd34d' 
                    : '#a7f3d0'
              }`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {message.type === 'error' ? <AlertTriangle size={17} /> : message.type === 'warning' ? <AlertTriangle size={17} color="#d97706" /> : <CheckCircle2 size={17} />}
                  <span>{message.text}</span>
                </div>
                {message.isDuplicate && (
                  <button
                    type="button"
                    onClick={() => handleUpload(true)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', color: '#92400e', borderColor: '#fcd34d' }}
                    title="Force re-upload and re-extract this receipt"
                  >
                    <span>Force Re-extract</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Upload Dropzone */}
          <div style={{
            border: '2px dashed var(--slate-300)',
            borderRadius: '12px',
            padding: '1.75rem 1.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--slate-50)',
            marginBottom: '1.5rem',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease'
          }} onClick={() => fileInputRef.current?.click()}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
            />
            <UploadCloud size={38} color="var(--gold-500)" style={{ margin: '0 auto 0.5rem' }} />
            <h4 style={{ fontWeight: 700, color: 'var(--slate-800)', fontSize: '0.92rem' }}>
              Click to browse or drop historical receipts here
            </h4>
            <p style={{ fontSize: '0.76rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
              Supports multiple PDF, JPG, JPEG, and PNG files up to 25 MB each. Files are preserved in MongoDB GridFS.
            </p>

            {selectedFiles.length > 0 && (
              <div style={{ marginTop: '1rem' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.85rem' }}>
                  {selectedFiles.map((file, idx) => (
                    <div 
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: '#ffffff',
                        border: '1px solid var(--border-color)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: 'var(--slate-800)'
                      }}
                    >
                      <FileText size={13} color="var(--gold-600)" />
                      <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {file.name}
                      </span>
                      <span style={{ color: 'var(--slate-500)', fontSize: '0.7rem' }}>
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveSelectedFile(idx); }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                        title="Remove file"
                      >
                        <X size={12} color="var(--slate-400)" />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleUpload(false); }}
                    disabled={isUploading}
                    className="btn btn-primary"
                    style={{ padding: '0.45rem 1.15rem', fontSize: '0.82rem' }}
                  >
                    <RefreshCw size={14} className={isUploading ? 'spin' : ''} />
                    <span>{isUploading ? 'Extracting & Uploading...' : `Upload & Extract (${selectedFiles.length})`}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedFiles([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Verification Panel */}
          {activeReviewItem && (
            <div style={{
              background: '#ffffff',
              border: '1.5px solid var(--gold-400)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 14px rgba(180, 133, 40, 0.15)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={16} color="var(--gold-500)" />
                  <span>Verify Extracted Invoice: {activeReviewItem.originalFilename}</span>
                </h4>
                {activeReviewItem.gridFsFileId && (
                  <a
                    href={api.getGridFSFileUrl(activeReviewItem.gridFsFileId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                  >
                    <ExternalLink size={13} />
                    <span>View Stored File (GridFS)</span>
                  </a>
                )}
              </div>

              <div className="form-grid" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label required">Invoice Number</label>
                  <input
                    type="text"
                    required
                    value={reviewFormData.invoiceNumber}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, invoiceNumber: e.target.value })}
                    className="form-input font-mono"
                    placeholder="006/11/26"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Client / Buyer Name</label>
                  <input
                    type="text"
                    required
                    value={reviewFormData.clientName}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, clientName: e.target.value })}
                    className="form-input"
                    placeholder="Goutam Bhattacharya"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={reviewFormData.invoiceDate}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, invoiceDate: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Customer (Bill To)</label>
                  <input
                    type="text"
                    required
                    value={reviewFormData.customerName}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, customerName: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Project Name</label>
                  <input
                    type="text"
                    value={reviewFormData.projectName}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, projectName: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit / Flat</label>
                  <input
                    type="text"
                    value={reviewFormData.flatNumber}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, flatNumber: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Taxable Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={reviewFormData.taxableAmount}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, taxableAmount: Number(e.target.value), pricePerUnit: Number(e.target.value) })}
                    className="form-input font-mono"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveReviewItem(null)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommitVerification}
                  disabled={verifying}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem' }}
                >
                  <Check size={14} />
                  <span>{verifying ? 'Saving to MongoDB...' : 'Confirm & Save to Invoices'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Upload History & Verification Queue Table */}
          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--slate-800)', marginBottom: '0.75rem' }}>
            Import History & Verification Queue
          </h4>

          {importsList.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', textAlign: 'center', padding: '1.5rem 0' }}>
              No receipt files uploaded yet. Drop PDF or image invoices above to extract details.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Extracted Invoice #</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {importsList.map((item) => (
                    <tr 
                      key={item._id}
                      style={activeReviewItem?._id === item._id ? { background: 'rgba(180, 133, 40, 0.08)', outline: '1.5px solid var(--gold-400)' } : undefined}
                    >
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--slate-900)', fontSize: '0.8rem' }}>
                          {item.originalFilename}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--slate-500)', fontFamily: 'JetBrains Mono' }}>
                          Hash: {item.fileHash ? item.fileHash.slice(0, 12) + '...' : '—'}
                        </span>
                      </td>
                      <td className="font-mono">
                        {item.extractedData?.invoiceNumber || '—'}
                      </td>
                      <td>
                        {item.extractedData?.clientName || '—'}
                      </td>
                      <td>
                        {item.extractedData?.invoiceDate || '—'}
                      </td>
                      <td>
                        {item.status === 'verified' ? (
                          <span className="badge badge-success">Verified & Saved</span>
                        ) : item.status === 'duplicate' ? (
                          <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>Duplicate</span>
                        ) : (
                          <span className="badge badge-gold">Pending Verification</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                          {item.status !== 'verified' ? (
                            <button
                              onClick={() => handleStartReview(item)}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                              title="Review & Verify Details"
                            >
                              <span>Review & Verify</span>
                            </button>
                          ) : (
                            item.gridFsFileId && (
                              <a
                                href={api.getGridFSFileUrl(item.gridFsFileId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', textDecoration: 'none' }}
                                title="View Original Stored Receipt File"
                              >
                                <Eye size={12} />
                                <span>View File</span>
                              </a>
                            )
                          )}

                          <button
                            onClick={() => handleRemoveImport(item)}
                            className="btn btn-danger"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                            title={item.status === 'verified' ? 'Remove receipt & move invoice to Trash' : 'Remove from import queue'}
                          >
                            <Trash2 size={13} />
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
