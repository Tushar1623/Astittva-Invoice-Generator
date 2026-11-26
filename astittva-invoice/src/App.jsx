import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import InvoiceForm from './components/InvoiceForm';
import InvoicePreview from './components/InvoicePreview';
import InvoiceHistory from './components/InvoiceHistory';
import SettingsModal from './components/SettingsModal';
import ImportReceiptsModal from './components/ImportReceiptsModal';
import TrashModal from './components/TrashModal';
import Login from './components/Login';
import { api } from './services/api';
import { getStoredCompanyDetails, saveCompanyDetails } from './data/companyDetails';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

const STORAGE_KEY_INVOICES = 'astittva_invoices';

export default function App() {
  // Authentication State (Single Authorized User)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('astittva_user');
      const token = localStorage.getItem('astittva_token');
      if (token && savedUser) return JSON.parse(savedUser);
    } catch (e) {}
    return null;
  });

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    showToast(`Welcome back, ${user.name || 'Admin'}!`);
    loadInvoicesFromBackend();
    loadSettingsFromBackend();
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    showToast('You have been signed out successfully.');
  };

  // Navigation tabs: 'dashboard' | 'create' | 'preview' | 'history'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);

  // Company Settings
  const [companyDetails, setCompanyDetails] = useState(getStoredCompanyDetails);

  // Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Invoices List
  const [invoices, setInvoices] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INVOICES);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Fetch Invoices and Settings from MongoDB on mount
  useEffect(() => {
    loadInvoicesFromBackend();
    loadSettingsFromBackend();
  }, []);

  const loadInvoicesFromBackend = async () => {
    try {
      const res = await api.getInvoices();
      if (res.success && res.invoices) {
        setInvoices(res.invoices);
        localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(res.invoices));
      }
    } catch (err) {
      console.warn('Backend offline or connecting; using LocalStorage cache:', err.message);
    }
  };

  const loadSettingsFromBackend = async () => {
    try {
      const res = await api.getSettings();
      if (res.success && res.settings) {
        setCompanyDetails(res.settings);
        saveCompanyDetails(res.settings);
      }
    } catch (err) {
      console.warn('Could not load backend settings:', err.message);
    }
  };

  // Save or update company details
  const handleSaveCompanyDetails = async (newDetails) => {
    setCompanyDetails(newDetails);
    saveCompanyDetails(newDetails);
    try {
      await api.updateSettings(newDetails);
    } catch (err) {
      console.warn('Backend settings update warning:', err.message);
    }
    showToast('Company, Bank & Tax settings updated successfully!');
  };

  // Create or Update Invoice
  const handleSaveInvoice = async (invoiceObj, andPreview = false) => {
    try {
      let savedInvoice = invoiceObj;
      const invoiceId = invoiceObj._id || invoiceObj.id;
      const isExisting = Boolean(invoiceId);

      if (isExisting) {
        const res = await api.updateInvoice(String(invoiceId), invoiceObj);
        if (res.success && res.invoice) savedInvoice = res.invoice;
      } else {
        const res = await api.createInvoice(invoiceObj);
        if (res.success && res.invoice) savedInvoice = res.invoice;
      }

      await loadInvoicesFromBackend();
      setSelectedInvoice(savedInvoice);

      if (andPreview) {
        setActiveTab('preview');
        showToast(`Invoice ${savedInvoice.invoiceNumber} saved! Opening A4 preview.`);
      } else {
        showToast(`Invoice ${savedInvoice.invoiceNumber} recorded and saved to MongoDB Atlas!`);
        setActiveTab('dashboard');
      }
    } catch (err) {
      showToast(`Error saving invoice: ${err.message}`, 'error');
    }
  };

  // Move Invoice to Trash
  const handleTrashInvoice = async (id) => {
    const target = invoices.find(i => (i._id === id || i.id === id));
    const num = target ? target.invoiceNumber : 'this invoice';
    if (!window.confirm(`Move invoice ${num} to Trash?`)) return;

    try {
      await api.trashInvoice(id);
      await loadInvoicesFromBackend();
      if (selectedInvoice?._id === id || selectedInvoice?.id === id) {
        setSelectedInvoice(null);
      }
      showToast(`Invoice ${num} moved to Trash. You can restore it from Trash.`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Duplicate Invoice Workflow
  const handleDuplicateInvoice = async (inv) => {
    const today = new Date().toISOString().slice(0, 10);
    const duplicated = {
      ...inv,
      _id: undefined,
      id: undefined,
      invoiceNumber: '',
      autoAllocate: true,
      invoiceDate: today
    };
    setSelectedInvoice(duplicated);
    setActiveTab('create');
    showToast(`Cloned invoice details. Ready to issue next sequential number.`);
  };

  // Edit Previous Invoice
  const handleEditInvoice = (inv) => {
    setSelectedInvoice(inv);
    setActiveTab('create');
  };

  // View Invoice Preview
  const handleViewInvoice = (inv) => {
    setSelectedInvoice(inv);
    setActiveTab('preview');
  };

  // Start fresh new invoice
  const handleCreateNew = () => {
    setSelectedInvoice(null);
    setActiveTab('create');
  };

  // Handle successful import or removal from modal
  const handleImportVerified = async (newInv) => {
    await loadInvoicesFromBackend();
    if (newInv && newInv.invoiceNumber) {
      showToast(`Imported receipt verified and added as invoice ${newInv.invoiceNumber}!`);
    }
  };

  // If user is not authenticated, display single-user login screen
  if (!currentUser) {
    return (
      <>
        {toast && (
          <div className={`toast toast-${toast.type} no-print`} style={{ zIndex: 9999 }}>
            {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="toast-close">
              <X size={14} />
            </button>
          </div>
        )}
        <Login onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <div className="app-container">
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenTrash={() => setIsTrashOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard
            invoices={invoices}
            companyDetails={companyDetails}
            onCreateNew={handleCreateNew}
            onViewInvoice={handleViewInvoice}
            onEditInvoice={handleEditInvoice}
            onDuplicateInvoice={handleDuplicateInvoice}
            onDeleteInvoice={handleTrashInvoice}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenImport={() => setIsImportOpen(true)}
          />
        )}

        {activeTab === 'create' && (
          <InvoiceForm
            key={selectedInvoice?._id || selectedInvoice?.id || 'new'}
            initialInvoice={selectedInvoice}
            companyDetails={companyDetails}
            lastInvoice={invoices && invoices.length > 0 ? invoices[0] : null}
            onSave={(inv) => handleSaveInvoice(inv, false)}
            onSaveAndPreview={(inv) => handleSaveInvoice(inv, true)}
            onCancel={() => {
              setSelectedInvoice(null);
              setActiveTab('dashboard');
            }}
          />
        )}

        {activeTab === 'preview' && (
          <InvoicePreview
            invoice={selectedInvoice || invoices[0]}
            companyDetails={companyDetails}
            onEdit={handleEditInvoice}
            onBack={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'history' && (
          <InvoiceHistory
            invoices={invoices}
            onViewInvoice={handleViewInvoice}
            onEditInvoice={handleEditInvoice}
            onDuplicateInvoice={handleDuplicateInvoice}
            onDeleteInvoice={handleTrashInvoice}
            onImportBackup={(arr) => { setInvoices(arr); showToast(`Restored ${arr.length} records.`); }}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        companyDetails={companyDetails}
        onSaveDetails={handleSaveCompanyDetails}
      />

      {/* Historical Receipts Import Modal */}
      <ImportReceiptsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportVerified}
      />

      {/* Trash Management Modal */}
      <TrashModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        onRestoreSuccess={async (num) => {
          await loadInvoicesFromBackend();
          showToast(`Invoice ${num} restored to active records.`);
        }}
        onDeleteSuccess={async (num) => {
          await loadInvoicesFromBackend();
          showToast(`Invoice ${num} permanently deleted.`);
        }}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="toast-container no-print">
          <div className="toast" style={{ borderColor: toast.type === 'error' ? 'var(--danger)' : 'var(--gold-500)' }}>
            {toast.type === 'error' ? <AlertTriangle size={16} color="var(--danger)" /> : <CheckCircle2 size={16} color="var(--gold-400)" />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--slate-400)',
                cursor: 'pointer',
                marginLeft: '0.5rem',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
