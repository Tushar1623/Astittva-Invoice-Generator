import React from 'react';
import { 
  PlusCircle, 
  History, 
  LayoutDashboard, 
  Settings as SettingsIcon,
  UploadCloud,
  Trash2,
  Database
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  onOpenSettings, 
  onOpenImport, 
  onOpenTrash 
}) {
  return (
    <header className="app-header no-print">
      <div className="header-inner">
        {/* Brand Logo & Title */}
        <div className="brand-section" onClick={() => setActiveTab('dashboard')} title="Back to Dashboard">
          <div className="brand-logo-container">
            <img src="/logo.png" alt="ASTITTVA Logo" className="brand-logo-img" />
          </div>
          <div className="brand-title-group">
            <h1>
              <span>ASTITTVA MARKETING</span>
            </h1>
            <div className="brand-subtitle-row">
              <span className="brand-subtitle">Tax Invoice Engine</span>
              <span className="brand-status-chip">
                <span className="status-dot"></span>
                <span>MongoDB Atlas</span>
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <nav className="header-nav">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <LayoutDashboard size={15} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`nav-btn ${activeTab === 'create' ? 'active' : ''}`}
            >
              <PlusCircle size={15} />
              <span>Create Invoice</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`}
            >
              <History size={15} />
              <span>Records</span>
            </button>
          </nav>

          {/* Import Receipts Button */}
          <button
            onClick={onOpenImport}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            title="Import Historical Receipt PDFs and Images"
          >
            <UploadCloud size={15} color="var(--gold-500)" />
            <span>Import Receipts</span>
          </button>

          {/* Trash Button */}
          <button
            onClick={onOpenTrash}
            className="header-settings-btn"
            title="Manage Trash & Soft-deleted Invoices"
            aria-label="Trash"
          >
            <Trash2 size={16} />
          </button>

          {/* Company & Bank Settings */}
          <button
            onClick={onOpenSettings}
            className="header-settings-btn"
            title="Configure Company, Bank & Tax Settings"
            aria-label="Settings"
          >
            <SettingsIcon size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
