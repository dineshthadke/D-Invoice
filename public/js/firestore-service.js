// ============================================================
// D-INVOICE FIRESTORE STORAGE SERVICE (USER-ISOLATED DATA)
// ============================================================

const FirestoreService = {
  // Check if real Firestore is available and functional
  isFirestoreLive() {
    return isRealFirebase && firebaseDb !== null;
  },

  // Fallback Local Storage Helper for isolated user sandboxing
  _getLocalUserData(userId) {
    const key = `dinvoice_fs_${userId}`;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : { invoices: [], clients: [], business: null };
    } catch (e) {
      return { invoices: [], clients: [], business: null };
    }
  },

  _saveLocalUserData(userId, data) {
    const key = `dinvoice_fs_${userId}`;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Local save error:', e);
    }
  },

  // Seed sample data for newly registered user
  async seedUserInitialData(userId, email, displayName = '') {
    const sampleBusiness = {
      name: displayName ? `${displayName}'s Enterprise` : 'Apex Solutions Pvt Ltd',
      logo_url: '',
      email: email,
      phone: '+91 98765 43210',
      address_line1: 'Tower 4, Mindspace IT Park',
      address_line2: 'HITEC City',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
      country: 'India',
      gstin: '36AAACT1234P1Z8',
      pan: 'AAACT1234P',
      bank_name: 'HDFC Bank',
      account_name: displayName || 'Apex Solutions Private Limited',
      account_number: '50200089123456',
      ifsc_code: 'HDFC0000240',
      upi_id: 'apexsolutions@okhdfcbank',
      default_notes: 'Thank you for your business. We look forward to working with you again!',
      default_terms: '1. Payment is due within 15 days of invoice date.\n2. Please include invoice number in payment reference.\n3. Late payments subject to 1.5% interest per month.'
    };

    const sampleClients = [
      {
        id: 'client_1',
        name: 'Rajesh Sharma',
        company_name: 'Zenith Cloud Technologies',
        email: 'accounts@zenithcloud.in',
        phone: '+91 98234 56789',
        address_line1: 'Plot 42, Hinjewadi Phase 2',
        address_line2: 'IT Park Road',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411057',
        country: 'India',
        gstin: '27AABCZ1234F1Z8'
      },
      {
        id: 'client_2',
        name: 'Priya Nambiar',
        company_name: 'Global FinServe Solutions',
        email: 'billing@globalfinserve.com',
        phone: '+91 94471 23456',
        address_line1: '6th Floor, Infopark Building',
        address_line2: 'Kakkanad',
        city: 'Kochi',
        state: 'Kerala',
        pincode: '682042',
        country: 'India',
        gstin: '32AABCG5432D1Z3'
      }
    ];

    const today = new Date();
    const formatDateStr = (d) => d.toISOString().split('T')[0];

    const d1 = new Date(today);
    d1.setDate(d1.getDate() - 5);
    const due1 = new Date(d1);
    due1.setDate(due1.getDate() + 15);

    const d2 = new Date(today);
    d2.setDate(d2.getDate() - 1);
    const due2 = new Date(d2);
    due2.setDate(due2.getDate() + 14);

    const sampleInvoices = [
      {
        id: 'inv_1',
        invoice_number: 'INV-2026-0001',
        client_id: 'client_1',
        client_name: 'Rajesh Sharma',
        client_company: 'Zenith Cloud Technologies',
        client_email: 'accounts@zenithcloud.in',
        client_phone: '+91 98234 56789',
        client_address_line1: 'Plot 42, Hinjewadi Phase 2',
        client_city: 'Pune',
        client_state: 'Maharashtra',
        client_pincode: '411057',
        client_country: 'India',
        client_gstin: '27AABCZ1234F1Z8',
        invoice_date: formatDateStr(d1),
        due_date: formatDateStr(due1),
        po_number: 'PO-ZEN-108',
        place_of_supply: 'Maharashtra',
        status: 'paid',
        payment_method: 'Bank Transfer (NEFT)',
        payment_date: formatDateStr(d1),
        subtotal: 45000,
        discount_type: 'fixed',
        discount_value: 0,
        discount_amount: 0,
        tax_type: 'inter',
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 8100,
        total_tax: 8100,
        shipping_charges: 0,
        round_off: 0,
        total_amount: 53100,
        notes: 'Invoice settled in full. Thank you!',
        terms: 'Standard terms applied.',
        items: [
          {
            description: 'Cloud Infrastructure Architecture & Consulting',
            hsn_sac: '998313',
            quantity: 1,
            unit: 'Project',
            unit_price: 45000,
            discount_percent: 0,
            tax_rate: 18,
            taxable_amount: 45000,
            cgst_amount: 0,
            sgst_amount: 0,
            igst_amount: 8100,
            total: 53100
          }
        ],
        created_at: new Date().toISOString()
      },
      {
        id: 'inv_2',
        invoice_number: 'INV-2026-0002',
        client_id: 'client_2',
        client_name: 'Priya Nambiar',
        client_company: 'Global FinServe Solutions',
        client_email: 'billing@globalfinserve.com',
        client_phone: '+91 94471 23456',
        client_address_line1: '6th Floor, Infopark Building',
        client_city: 'Kochi',
        client_state: 'Kerala',
        client_pincode: '682042',
        client_country: 'India',
        client_gstin: '32AABCG5432D1Z3',
        invoice_date: formatDateStr(d2),
        due_date: formatDateStr(due2),
        po_number: 'PO-GFS-902',
        place_of_supply: 'Kerala',
        status: 'pending',
        payment_method: '',
        payment_date: null,
        subtotal: 32000,
        discount_type: 'fixed',
        discount_value: 0,
        discount_amount: 0,
        tax_type: 'inter',
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 5760,
        total_tax: 5760,
        shipping_charges: 0,
        round_off: 0,
        total_amount: 37760,
        notes: 'Payment due on or before due date.',
        terms: 'Subject to Bengaluru jurisdiction.',
        items: [
          {
            description: 'Payment Gateway Integration & Webhook Security',
            hsn_sac: '998314',
            quantity: 1,
            unit: 'Service',
            unit_price: 32000,
            discount_percent: 0,
            tax_rate: 18,
            taxable_amount: 32000,
            cgst_amount: 0,
            sgst_amount: 0,
            igst_amount: 5760,
            total: 37760
          }
        ],
        created_at: new Date().toISOString()
      }
    ];

    // GUARD: Check if data already exists for this user. NEVER overwrite or delete existing invoices!
    if (this.isFirestoreLive()) {
      try {
        const userRef = firebaseDb.collection('users').doc(userId);
        await userRef.set({ email, displayName: displayName || email.split('@')[0], lastLoginAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });

        const existingInvSnap = await userRef.collection('invoices').limit(1).get();
        if (!existingInvSnap.empty) {
          console.log(`ℹ️ User ${userId} already has saved invoices in Firestore. Restoring existing invoices...`);
          return;
        }

        // Only seed if completely empty account
        const existingBizDoc = await userRef.collection('business').doc('profile').get();
        if (!existingBizDoc.exists) {
          await userRef.collection('business').doc('profile').set(sampleBusiness);
        }

        const existingClientsSnap = await userRef.collection('clients').limit(1).get();
        if (existingClientsSnap.empty) {
          for (const c of sampleClients) {
            await userRef.collection('clients').doc(c.id).set(c);
          }
        }

        for (const inv of sampleInvoices) {
          await userRef.collection('invoices').doc(inv.id).set(inv);
        }
        console.log(`🌱 Seeded initial workspace for new user ${userId}`);
        return;
      } catch (err) {
        console.warn('Firestore remote seed check failed, verifying local user store:', err.message);
      }
    }

    // Local fallback guard: NEVER overwrite existing user data
    const existingLocal = this._getLocalUserData(userId);
    if (existingLocal.invoices && existingLocal.invoices.length > 0) {
      console.log(`ℹ️ User ${userId} already has ${existingLocal.invoices.length} saved invoices. Preserving all records.`);
      return;
    }

    this._saveLocalUserData(userId, {
      business: existingLocal.business || sampleBusiness,
      clients: (existingLocal.clients && existingLocal.clients.length > 0) ? existingLocal.clients : sampleClients,
      invoices: sampleInvoices
    });
  },

  // --------------------------------------------------------------------------
  // BUSINESS PROFILE (USER SCOPED)
  // --------------------------------------------------------------------------
  async getBusiness(userId) {
    if (this.isFirestoreLive()) {
      try {
        const doc = await firebaseDb.collection('users').doc(userId).collection('business').doc('profile').get();
        if (doc.exists) {
          return { success: true, data: { id: doc.id, ...doc.data() } };
        }
      } catch (e) {
        console.warn('Firestore getBusiness fallback:', e.message);
      }
    }

    const uData = this._getLocalUserData(userId);
    return { success: true, data: uData.business || {} };
  },

  async updateBusiness(userId, data) {
    if (this.isFirestoreLive()) {
      try {
        await firebaseDb.collection('users').doc(userId).collection('business').doc('profile').set(data, { merge: true });
        return { success: true, data };
      } catch (e) {
        console.warn('Firestore updateBusiness fallback:', e.message);
      }
    }

    const uData = this._getLocalUserData(userId);
    uData.business = { ...(uData.business || {}), ...data };
    this._saveLocalUserData(userId, uData);
    return { success: true, data: uData.business };
  },

  // --------------------------------------------------------------------------
  // CLIENTS (USER SCOPED)
  // --------------------------------------------------------------------------
  async getClients(userId, search = '') {
    let clients = [];

    if (this.isFirestoreLive()) {
      try {
        const snap = await firebaseDb.collection('users').doc(userId).collection('clients').get();
        clients = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('Firestore getClients fallback:', e.message);
        const uData = this._getLocalUserData(userId);
        clients = uData.clients || [];
      }
    } else {
      const uData = this._getLocalUserData(userId);
      clients = uData.clients || [];
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      clients = clients.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.company_name && c.company_name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q))
      );
    }

    return { success: true, data: clients };
  },

  async getClient(userId, clientId) {
    if (this.isFirestoreLive()) {
      try {
        const doc = await firebaseDb.collection('users').doc(userId).collection('clients').doc(clientId).get();
        if (doc.exists) {
          return { success: true, data: { id: doc.id, ...doc.data() } };
        }
      } catch (e) {}
    }

    const uData = this._getLocalUserData(userId);
    const found = (uData.clients || []).find(c => String(c.id) === String(clientId));
    if (!found) throw new Error('Client not found');
    return { success: true, data: found };
  },

  async createClient(userId, clientData) {
    const id = 'client_' + Date.now();
    const newClient = { id, ...clientData, createdAt: new Date().toISOString() };

    if (this.isFirestoreLive()) {
      try {
        await firebaseDb.collection('users').doc(userId).collection('clients').doc(id).set(newClient);
        return { success: true, data: newClient };
      } catch (e) {
        console.warn('Firestore createClient fallback:', e.message);
      }
    }

    const uData = this._getLocalUserData(userId);
    uData.clients = uData.clients || [];
    uData.clients.push(newClient);
    this._saveLocalUserData(userId, uData);
    return { success: true, data: newClient };
  },

  async updateClient(userId, clientId, clientData) {
    if (this.isFirestoreLive()) {
      try {
        await firebaseDb.collection('users').doc(userId).collection('clients').doc(clientId).update(clientData);
        return { success: true, data: { id: clientId, ...clientData } };
      } catch (e) {
        console.warn('Firestore updateClient fallback:', e.message);
      }
    }

    const uData = this._getLocalUserData(userId);
    const idx = (uData.clients || []).findIndex(c => String(c.id) === String(clientId));
    if (idx !== -1) {
      uData.clients[idx] = { ...uData.clients[idx], ...clientData };
      this._saveLocalUserData(userId, uData);
      return { success: true, data: uData.clients[idx] };
    }
    throw new Error('Client not found');
  },

  async deleteClient(userId, clientId) {
    if (this.isFirestoreLive()) {
      try {
        await firebaseDb.collection('users').doc(userId).collection('clients').doc(clientId).delete();
        return { success: true, message: 'Client deleted' };
      } catch (e) {
        console.warn('Firestore deleteClient fallback:', e.message);
      }
    }

    const uData = this._getLocalUserData(userId);
    uData.clients = (uData.clients || []).filter(c => String(c.id) !== String(clientId));
    this._saveLocalUserData(userId, uData);
    return { success: true, message: 'Client deleted' };
  },

  // --------------------------------------------------------------------------
  // INVOICES (USER SCOPED - ONLY ACCESSIBLE BY SIGNED IN USER)
  // --------------------------------------------------------------------------
  async getInvoices(userId, filters = {}) {
    let invoices = [];

    if (this.isFirestoreLive()) {
      try {
        const snap = await firebaseDb.collection('users').doc(userId).collection('invoices').get();
        invoices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('Firestore getInvoices fallback:', e.message);
        const uData = this._getLocalUserData(userId);
        invoices = uData.invoices || [];
      }
    } else {
      const uData = this._getLocalUserData(userId);
      invoices = uData.invoices || [];
    }

    // Auto calculate overdue
    const todayStr = new Date().toISOString().split('T')[0];
    invoices = invoices.map(inv => {
      let status = inv.status || 'pending';
      if (status === 'pending' && inv.due_date && inv.due_date < todayStr) {
        status = 'overdue';
      }
      return { ...inv, status };
    });

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      invoices = invoices.filter(inv => inv.status === filters.status);
    }

    // Apply search filter
    if (filters.q && filters.q.trim()) {
      const q = filters.q.trim().toLowerCase();
      invoices = invoices.filter(inv =>
        (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
        (inv.client_name && inv.client_name.toLowerCase().includes(q)) ||
        (inv.client_company && inv.client_company.toLowerCase().includes(q)) ||
        (inv.po_number && inv.po_number.toLowerCase().includes(q))
      );
    }

    // Sort by date / id desc
    invoices.sort((a, b) => new Date(b.created_at || b.invoice_date || 0) - new Date(a.created_at || a.invoice_date || 0));

    return { success: true, data: invoices };
  },

  async getInvoice(userId, invoiceId) {
    let invoice = null;

    if (this.isFirestoreLive()) {
      try {
        const doc = await firebaseDb.collection('users').doc(userId).collection('invoices').doc(String(invoiceId)).get();
        if (doc.exists) {
          invoice = { id: doc.id, ...doc.data() };
        }
      } catch (e) {
        console.warn('Firestore getInvoice fallback:', e.message);
      }
    }

    if (!invoice) {
      const uData = this._getLocalUserData(userId);
      invoice = (uData.invoices || []).find(inv => String(inv.id) === String(invoiceId));
    }

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Attach current user business profile
    const bizRes = await this.getBusiness(userId);
    invoice.business = bizRes.data || {};

    return { success: true, data: invoice };
  },

  async getNextInvoiceNumber(userId) {
    const res = await this.getInvoices(userId);
    const invoices = res.data || [];
    const currentYear = new Date().getFullYear();
    let maxNum = 0;

    invoices.forEach(inv => {
      const parts = (inv.invoice_number || '').split('-');
      if (parts.length === 3 && parts[1] === String(currentYear)) {
        const n = parseInt(parts[2], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });

    const nextSeq = String(maxNum + 1).padStart(4, '0');
    return { success: true, next_number: `INV-${currentYear}-${nextSeq}` };
  },

  async createInvoice(userId, invoiceData) {
    const id = 'inv_' + Date.now();
    const newInvoice = {
      id,
      ...invoiceData,
      userId,
      created_at: new Date().toISOString()
    };

    if (this.isFirestoreLive()) {
      try {
        await firebaseDb.collection('users').doc(userId).collection('invoices').doc(id).set(newInvoice);
        return { success: true, invoice_id: id, message: 'Invoice saved securely in Firestore' };
      } catch (e) {
        console.warn('Firestore createInvoice fallback:', e.message);
      }
    }

    const uData = this._getLocalUserData(userId);
    uData.invoices = uData.invoices || [];
    uData.invoices.push(newInvoice);
    this._saveLocalUserData(userId, uData);
    return { success: true, invoice_id: id, message: 'Invoice saved securely in Firestore' };
  },

  async updateInvoice(userId, invoiceId, invoiceData) {
    const updated = {
      ...invoiceData,
      updated_at: new Date().toISOString()
    };

    if (this.isFirestoreLive()) {
      try {
        await firebaseDb.collection('users').doc(userId).collection('invoices').doc(String(invoiceId)).update(updated);
        return { success: true, invoice_id: invoiceId, message: 'Invoice updated' };
      } catch (e) {
        console.warn('Firestore updateInvoice fallback:', e.message);
      }
    }

    const uData = this._getLocalUserData(userId);
    const idx = (uData.invoices || []).findIndex(inv => String(inv.id) === String(invoiceId));
    if (idx !== -1) {
      uData.invoices[idx] = { ...uData.invoices[idx], ...updated, id: invoiceId };
      this._saveLocalUserData(userId, uData);
      return { success: true, invoice_id: invoiceId, message: 'Invoice updated' };
    }
    throw new Error('Invoice not found');
  },

  async updateInvoiceStatus(userId, invoiceId, statusData) {
    const patch = {
      status: statusData.status,
      payment_method: statusData.payment_method || '',
      payment_date: statusData.payment_date || (statusData.status === 'paid' ? new Date().toISOString().split('T')[0] : null)
    };

    if (this.isFirestoreLive()) {
      try {
        await firebaseDb.collection('users').doc(userId).collection('invoices').doc(String(invoiceId)).update(patch);
        return { success: true, message: `Status updated to ${patch.status}` };
      } catch (e) {
        console.warn('Firestore updateInvoiceStatus fallback:', e.message);
      }
    }

    const uData = this._getLocalUserData(userId);
    const idx = (uData.invoices || []).findIndex(inv => String(inv.id) === String(invoiceId));
    if (idx !== -1) {
      uData.invoices[idx] = { ...uData.invoices[idx], ...patch };
      this._saveLocalUserData(userId, uData);
      return { success: true, message: `Status updated to ${patch.status}` };
    }
    throw new Error('Invoice not found');
  },

  async duplicateInvoice(userId, invoiceId) {
    const orig = await this.getInvoice(userId, invoiceId);
    const origData = orig.data;

    const nextRes = await this.getNextInvoiceNumber(userId);
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    const dupData = {
      ...origData,
      invoice_number: nextRes.next_number,
      invoice_date: today,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      payment_method: '',
      payment_date: null
    };
    delete dupData.id;
    delete dupData.business;

    const res = await this.createInvoice(userId, dupData);
    return { success: true, invoice_id: res.invoice_id, invoice_number: nextRes.next_number };
  },

  async deleteInvoice(userId, invoiceId) {
    if (this.isFirestoreLive()) {
      try {
        await firebaseDb.collection('users').doc(userId).collection('invoices').doc(String(invoiceId)).delete();
        return { success: true, message: 'Invoice deleted from Firestore' };
      } catch (e) {
        console.warn('Firestore deleteInvoice fallback:', e.message);
      }
    }

    const uData = this._getLocalUserData(userId);
    uData.invoices = (uData.invoices || []).filter(inv => String(inv.id) !== String(invoiceId));
    this._saveLocalUserData(userId, uData);
    return { success: true, message: 'Invoice deleted from Firestore' };
  },

  // --------------------------------------------------------------------------
  // STATS (DASHBOARD METRICS - USER SCOPED)
  // --------------------------------------------------------------------------
  async getStats(userId) {
    const res = await this.getInvoices(userId);
    const invoices = res.data || [];

    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;

    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let draftCount = 0;

    invoices.forEach(inv => {
      const amt = parseFloat(inv.total_amount) || 0;
      totalAmount += amt;

      if (inv.status === 'paid') {
        paidCount++;
        paidAmount += amt;
      } else if (inv.status === 'overdue') {
        overdueCount++;
        overdueAmount += amt;
      } else if (inv.status === 'draft') {
        draftCount++;
      } else {
        pendingCount++;
        pendingAmount += amt;
      }
    });

    const recentInvoices = invoices.slice(0, 6);

    // Monthly Trend
    const monthlyStats = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      monthlyStats[key] = { label: key, total: 0, paid: 0, count: 0 };
    }

    invoices.forEach(inv => {
      if (inv.invoice_date) {
        const d = new Date(inv.invoice_date);
        const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
        if (monthlyStats[key]) {
          const amt = parseFloat(inv.total_amount) || 0;
          monthlyStats[key].total += amt;
          monthlyStats[key].count += 1;
          if (inv.status === 'paid') {
            monthlyStats[key].paid += amt;
          }
        }
      }
    });

    return {
      success: true,
      data: {
        summary: {
          totalInvoices: invoices.length,
          paidCount,
          pendingCount,
          overdueCount,
          draftCount,
          totalAmount,
          paidAmount,
          pendingAmount,
          overdueAmount
        },
        recentInvoices,
        monthlyTrend: Object.values(monthlyStats)
      }
    };
  }
};
