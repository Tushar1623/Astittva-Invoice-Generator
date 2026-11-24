/**
 * ASTITTVA API Client Service
 * Centralized HTTP client communicating with Express backend & MongoDB Atlas.
 */

// Use local proxy /api in development, or VITE_API_URL when explicitly deployed / production
const REMOTE_API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` : null;
let activeBaseUrl = import.meta.env.DEV ? '/api' : (REMOTE_API || '/api');

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
    // If remote connection failed, auto-fallback to local /api proxy if available
    if (REMOTE_API && resource.startsWith(REMOTE_API)) {
      console.warn(`[API] Remote endpoint ${resource} unreachable (${error.message}). Failing over to /api...`);
      activeBaseUrl = '/api';
      const fallbackResource = resource.replace(REMOTE_API, '/api');
      return fetch(fallbackResource, fetchOptions);
    }
    if (error.name === 'AbortError') {
      throw new Error('Connection timed out. Server took too long to respond.');
    }
    throw error;
  }
}

function getBaseUrl() {
  return activeBaseUrl;
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
    const res = await fetchWithTimeout(`${getBaseUrl()}/invoices?${query}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch invoices');
    return await res.json();
  },

  async getInvoiceById(id) {
    const res = await fetchWithTimeout(`${getBaseUrl()}/invoices/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch invoice');
    return await res.json();
  },

  async peekNextNumber(clientName = '', date = '') {
    const query = new URLSearchParams({ clientName, date }).toString();
    const res = await fetchWithTimeout(`${getBaseUrl()}/invoices/next-number?${query}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to peek next invoice number');
    return await res.json();
  },

  async createInvoice(invoiceData) {
    const res = await fetchWithTimeout(`${getBaseUrl()}/invoices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(invoiceData)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create invoice');
    return json;
  },

  async updateInvoice(id, invoiceData) {
    const res = await fetchWithTimeout(`${getBaseUrl()}/invoices/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(invoiceData)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update invoice');
    return json;
  },

  async trashInvoice(id) {
    const res = await fetchWithTimeout(`${getBaseUrl()}/invoices/${id}/trash`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to move invoice to trash');
    return json;
  },

  async restoreInvoice(id) {
    const res = await fetchWithTimeout(`${getBaseUrl()}/invoices/${id}/restore`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to restore invoice');
    return json;
  },

  async permanentDeleteInvoice(id) {
    const res = await fetchWithTimeout(`${getBaseUrl()}/invoices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete invoice');
    return json;
  },

  // Historical Receipts & Imports API
  async uploadReceipts(formData, force = false) {
    const token = localStorage.getItem('astittva_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const url = force ? `${getBaseUrl()}/imports/upload?force=true` : `${getBaseUrl()}/imports/upload`;
    const res = await fetchWithTimeout(url, {
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
    const res = await fetchWithTimeout(`${getBaseUrl()}/imports`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch imports');
    return await res.json();
  },

  async verifyImport(importId, verifiedData) {
    const res = await fetchWithTimeout(`${getBaseUrl()}/imports/${importId}/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(verifiedData)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to verify import');
    return json;
  },

  async deleteImport(id) {
    const res = await fetchWithTimeout(`${getBaseUrl()}/imports/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to remove receipt from import history');
    return json;
  },

  getGridFSFileUrl(fileId) {
    return `${getBaseUrl()}/imports/file/${fileId}`;
  },

  // Settings API
  async getSettings() {
    const res = await fetchWithTimeout(`${getBaseUrl()}/settings`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch settings');
    return await res.json();
  },

  async updateSettings(settingsData) {
    const res = await fetchWithTimeout(`${getBaseUrl()}/settings`, {
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
    const res = await fetchWithTimeout(`${getBaseUrl()}/auth/login`, {
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
