/**
 * ASTITTVA API Client Service
 * Centralized HTTP client communicating with Express backend & MongoDB Atlas.
 */

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const BASE_URL = API_BASE;

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 12000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Connection timed out. Render backend may be waking up.');
    }
    throw error;
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('astittva_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Invoices API
  async getInvoices(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetchWithTimeout(`${BASE_URL}/invoices?${query}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch invoices');
    return await res.json();
  },

  async getInvoiceById(id) {
    const res = await fetchWithTimeout(`${BASE_URL}/invoices/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch invoice');
    return await res.json();
  },

  async peekNextNumber(clientName = '', date = '') {
    const query = new URLSearchParams({ clientName, date }).toString();
    const res = await fetchWithTimeout(`${BASE_URL}/invoices/next-number?${query}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to peek next invoice number');
    return await res.json();
  },

  async createInvoice(invoiceData) {
    const res = await fetchWithTimeout(`${BASE_URL}/invoices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(invoiceData)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create invoice');
    return json;
  },

  async updateInvoice(id, invoiceData) {
    const res = await fetchWithTimeout(`${BASE_URL}/invoices/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(invoiceData)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update invoice');
    return json;
  },

  async trashInvoice(id) {
    const res = await fetchWithTimeout(`${BASE_URL}/invoices/${id}/trash`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to move invoice to trash');
    return json;
  },

  async restoreInvoice(id) {
    const res = await fetchWithTimeout(`${BASE_URL}/invoices/${id}/restore`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to restore invoice');
    return json;
  },

  async permanentDeleteInvoice(id) {
    const res = await fetchWithTimeout(`${BASE_URL}/invoices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete invoice');
    return json;
  },

  // Historical Receipts & Imports API
  async uploadReceipts(formData) {
    const token = localStorage.getItem('astittva_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetchWithTimeout(`${BASE_URL}/imports/upload`, {
      method: 'POST',
      headers,
      body: formData,
      timeout: 60000 // allow up to 60s for multi-file OCR upload
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to upload receipts');
    return json;
  },

  async getImports() {
    const res = await fetchWithTimeout(`${BASE_URL}/imports`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch imports');
    return await res.json();
  },

  async verifyImport(importId, verifiedData) {
    const res = await fetchWithTimeout(`${BASE_URL}/imports/${importId}/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(verifiedData)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to verify import');
    return json;
  },

  async deleteImport(id) {
    const res = await fetchWithTimeout(`${BASE_URL}/imports/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to remove receipt from import history');
    return json;
  },

  getGridFSFileUrl(fileId) {
    return `${BASE_URL}/imports/file/${fileId}`;
  },

  // Settings API
  async getSettings() {
    const res = await fetchWithTimeout(`${BASE_URL}/settings`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch settings');
    return await res.json();
  },

  async updateSettings(settingsData) {
    const res = await fetchWithTimeout(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settingsData)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update settings');
    return json;
  },

  // Auth API
  async login(email, password) {
    const res = await fetchWithTimeout(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');
    if (json.token) {
      localStorage.setItem('astittva_token', json.token);
      localStorage.setItem('astittva_user', JSON.stringify(json.user));
    }
    return json;
  },

  logout() {
    localStorage.removeItem('astittva_token');
    localStorage.removeItem('astittva_user');
  }
};
