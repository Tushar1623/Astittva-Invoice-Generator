import React from 'react';
import { 
  PlusCircle, 
  History, 
  LayoutDashboard, 
  Settings as SettingsIcon,
  UploadCloud,
  Trash2,
  Database,
  User,
  LogOut
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  onOpenSettings, 
  onOpenImport, 
  onOpenTrash,
  currentUser = null,
  onLogout = null
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <nav className="header-nav">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <LayoutDashboard size={17} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`nav-btn ${activeTab === 'create' ? 'active' : ''}`}
            >
              <PlusCircle size={17} />
              <span>Create Invoice</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`}
            >
              <History size={17} />
              <span>Records</span>
            </button>
          </nav>

          {/* Import Receipts Button */}
          <button
            onClick={onOpenImport}
            className="btn btn-secondary"
            style={{ padding: '0.55rem 1.05rem', fontSize: '0.88rem', fontWeight: 700 }}
            title="Import Historical Receipt PDFs and Images"
          >
            <UploadCloud size={17} color="var(--gold-600)" />
            <span>Import Receipts</span>
          </button>

          {/* Trash Button */}
          <button
            onClick={onOpenTrash}
            className="header-settings-btn"
            style={{ width: '40px', height: '40px' }}
            title="Manage Trash & Soft-deleted Invoices"
            aria-label="Trash"
          >
            <Trash2 size={18} />
          </button>

          {/* Company & Bank Settings */}
          <button
            onClick={onOpenSettings}
            className="header-settings-btn"
            style={{ width: '40px', height: '40px' }}
            title="Configure Company, Bank & Tax Settings"
            aria-label="Settings"
          >
            <SettingsIcon size={18} />
          </button>

          {/* User Profile Pill & Logout */}
          {currentUser && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.65rem 0.35rem 0.75rem',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              marginLeft: '0.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <User size={15} color="#f59e0b" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                  {currentUser.name || 'Admin'}
                </span>
                <span className="badge badge-gold" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                  {currentUser.role || 'admin'}
                </span>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.2rem',
                    marginLeft: '0.25rem',
                    borderRadius: '4px',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                  title="Log Out of System"
                >
                  <LogOut size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
