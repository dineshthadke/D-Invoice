// ============================================================
// D-INVOICE API CLIENT
// ============================================================

const API = {
  async request(endpoint, options = {}) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        ...options
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Stats
  async getStats() {
    return this.request('/api/stats');
  },

  // Business Profile
  async getBusiness() {
    return this.request('/api/business');
  },
  async updateBusiness(data) {
    return this.request('/api/business', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  async uploadLogo(file) {
    const formData = new FormData();
    formData.append('logo', file);
    const res = await fetch('/api/business/logo', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload logo');
    return data;
  },

  // Clients
  async getClients(search = '') {
    const q = search ? `?q=${encodeURIComponent(search)}` : '';
    return this.request(`/api/clients${q}`);
  },
  async getClient(id) {
    return this.request(`/api/clients/${id}`);
  },
  async createClient(data) {
    return this.request('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async updateClient(id, data) {
    return this.request(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  async deleteClient(id) {
    return this.request(`/api/clients/${id}`, {
      method: 'DELETE'
    });
  },

  // Invoices
  async getInvoices(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/invoices${query ? '?' + query : ''}`);
  },
  async getNextInvoiceNumber() {
    return this.request('/api/invoices/next-number');
  },
  async getInvoice(id) {
    return this.request(`/api/invoices/${id}`);
  },
  async createInvoice(data) {
    return this.request('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  async updateInvoice(id, data) {
    return this.request(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  async updateInvoiceStatus(id, statusData) {
    return this.request(`/api/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData)
    });
  },
  async duplicateInvoice(id) {
    return this.request(`/api/invoices/${id}/duplicate`, {
      method: 'POST'
    });
  },
  async deleteInvoice(id) {
    return this.request(`/api/invoices/${id}`, {
      method: 'DELETE'
    });
  },

  // Settings / Database
  async getDbStatus() {
    return this.request('/api/settings/db');
  },
  async testAndConnectMySQL(config) {
    return this.request('/api/settings/db/test', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }
};
