// ============================================================
// D-INVOICE API CLIENT (INTEGRATED WITH FIRESTORE USER STORAGE)
// ============================================================

const API = {
  // Helper to ensure authenticated user UID is available
  _getUserId() {
    if (Auth && Auth.currentUser && Auth.currentUser.uid) {
      return Auth.currentUser.uid;
    }
    // Fallback if accessed during initialization
    return 'default_user';
  },

  // Fallback REST backend request
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

  // Stats (Scoped to current authenticated Firebase user)
  async getStats() {
    const uid = this._getUserId();
    return FirestoreService.getStats(uid);
  },

  // Business Profile (Scoped to current authenticated Firebase user)
  async getBusiness() {
    const uid = this._getUserId();
    return FirestoreService.getBusiness(uid);
  },
  async updateBusiness(data) {
    const uid = this._getUserId();
    return FirestoreService.updateBusiness(uid, data);
  },
  async uploadLogo(file) {
    // Convert to base64 Data URL or upload to backend
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({ success: true, logo_url: e.target.result });
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  },

  // Clients (Scoped to current authenticated Firebase user)
  async getClients(search = '') {
    const uid = this._getUserId();
    return FirestoreService.getClients(uid, search);
  },
  async getClient(id) {
    const uid = this._getUserId();
    return FirestoreService.getClient(uid, id);
  },
  async createClient(data) {
    const uid = this._getUserId();
    return FirestoreService.createClient(uid, data);
  },
  async updateClient(id, data) {
    const uid = this._getUserId();
    return FirestoreService.updateClient(uid, id, data);
  },
  async deleteClient(id) {
    const uid = this._getUserId();
    return FirestoreService.deleteClient(uid, id);
  },

  // Invoices (Scoped to current authenticated Firebase user in Firestore)
  async getInvoices(params = {}) {
    const uid = this._getUserId();
    return FirestoreService.getInvoices(uid, params);
  },
  async getNextInvoiceNumber() {
    const uid = this._getUserId();
    return FirestoreService.getNextInvoiceNumber(uid);
  },
  async getInvoice(id) {
    const uid = this._getUserId();
    return FirestoreService.getInvoice(uid, id);
  },
  async createInvoice(data) {
    const uid = this._getUserId();
    return FirestoreService.createInvoice(uid, data);
  },
  async updateInvoice(id, data) {
    const uid = this._getUserId();
    return FirestoreService.updateInvoice(uid, id, data);
  },
  async updateInvoiceStatus(id, statusData) {
    const uid = this._getUserId();
    return FirestoreService.updateInvoiceStatus(uid, id, statusData);
  },
  async duplicateInvoice(id) {
    const uid = this._getUserId();
    return FirestoreService.duplicateInvoice(uid, id);
  },
  async deleteInvoice(id) {
    const uid = this._getUserId();
    return FirestoreService.deleteInvoice(uid, id);
  },

  // Database / System Settings
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
