// ============================================================
// D-INVOICE CLIENTS CONTROLLER
// ============================================================

const Clients = {
  clients: [],
  onClientSavedCallback: null,
  searchTimeout: null,

  async init() {
    this.populateStateDropdown();
    await this.loadClients();
  },

  populateStateDropdown() {
    const select = document.getElementById('cModalState');
    if (!select) return;
    select.innerHTML = INDIAN_STATES.map(s => `<option value="${s}">${s}</option>`).join('');
  },

  async loadClients() {
    const q = document.getElementById('clientSearchInput') ? document.getElementById('clientSearchInput').value.trim() : '';
    const tbody = document.getElementById('clientsTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Loading clients...</td></tr>';

    try {
      const res = await API.getClients(q);
      if (!res.success) throw new Error(res.error || 'Failed to fetch clients');

      this.clients = res.data || [];
      this.render();
    } catch (err) {
      console.error('Clients load error:', err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="table-empty text-danger">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
  },

  render() {
    const tbody = document.getElementById('clientsTableBody');
    if (!tbody) return;

    if (this.clients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No clients found. Click "Add New Client" to create your first client profile!</td></tr>';
      return;
    }

    let html = '';
    this.clients.forEach(c => {
      const cityState = [c.city, c.state].filter(Boolean).join(', ');
      const contactInfo = [
        c.email ? `<small>${escapeHtml(c.email)}</small>` : '',
        c.phone ? `<small class="text-muted font-mono">${escapeHtml(c.phone)}</small>` : ''
      ].filter(Boolean).join('<br>');

      html += `
        <tr>
          <td><strong>${escapeHtml(c.name)}</strong></td>
          <td>${escapeHtml(c.company_name || '-')}</td>
          <td>${contactInfo || '-'}</td>
          <td>${escapeHtml(cityState || '-')}</td>
          <td class="font-mono">${escapeHtml(c.gstin || '-')}</td>
          <td class="text-right">
            <div class="table-actions">
              <button class="btn-table-icon" title="Edit Client" onclick="Clients.openEditModal(${c.id})">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="btn-table-icon danger" title="Delete Client" onclick="Clients.confirmDelete(${c.id}, '${escapeHtml(c.name)}')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  },

  onSearch(val) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadClients();
    }, 250);
  },

  openAddModal(callback = null) {
    this.onClientSavedCallback = callback;
    document.getElementById('clientModalTitle').textContent = 'Add New Client';
    document.getElementById('modalClientId').value = '';

    document.getElementById('cModalName').value = '';
    document.getElementById('cModalCompany').value = '';
    document.getElementById('cModalEmail').value = '';
    document.getElementById('cModalPhone').value = '';
    document.getElementById('cModalGstin').value = '';
    document.getElementById('cModalAddress1').value = '';
    document.getElementById('cModalCity').value = '';
    document.getElementById('cModalState').value = 'Karnataka';
    document.getElementById('cModalPincode').value = '';
    document.getElementById('cModalCountry').value = 'India';

    document.getElementById('clientModal').style.display = 'flex';
  },

  async openEditModal(clientId) {
    try {
      const res = await API.getClient(clientId);
      if (!res.success) throw new Error(res.error || 'Client not found');

      const c = res.data;
      document.getElementById('clientModalTitle').textContent = `Edit Client: ${c.name}`;
      document.getElementById('modalClientId').value = c.id;

      document.getElementById('cModalName').value = c.name || '';
      document.getElementById('cModalCompany').value = c.company_name || '';
      document.getElementById('cModalEmail').value = c.email || '';
      document.getElementById('cModalPhone').value = c.phone || '';
      document.getElementById('cModalGstin').value = c.gstin || '';
      document.getElementById('cModalAddress1').value = c.address_line1 || '';
      document.getElementById('cModalCity').value = c.city || '';
      document.getElementById('cModalState').value = c.state || 'Karnataka';
      document.getElementById('cModalPincode').value = c.pincode || '';
      document.getElementById('cModalCountry').value = c.country || 'India';

      document.getElementById('clientModal').style.display = 'flex';
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  closeModal() {
    document.getElementById('clientModal').style.display = 'none';
    this.onClientSavedCallback = null;
  },

  async saveModal() {
    const id = document.getElementById('modalClientId').value;
    const name = document.getElementById('cModalName').value.trim();

    if (!name) {
      showToast('Client name is required', 'warning');
      return;
    }

    const payload = {
      name,
      company_name: document.getElementById('cModalCompany').value.trim(),
      email: document.getElementById('cModalEmail').value.trim(),
      phone: document.getElementById('cModalPhone').value.trim(),
      gstin: document.getElementById('cModalGstin').value.trim().toUpperCase(),
      address_line1: document.getElementById('cModalAddress1').value.trim(),
      city: document.getElementById('cModalCity').value.trim(),
      state: document.getElementById('cModalState').value,
      pincode: document.getElementById('cModalPincode').value.trim(),
      country: document.getElementById('cModalCountry').value.trim() || 'India'
    };

    try {
      let res;
      if (id) {
        res = await API.updateClient(id, payload);
      } else {
        res = await API.createClient(payload);
      }

      if (res.success) {
        showToast(`Client ${name} saved successfully!`, 'success');
        this.closeModal();
        this.loadClients();

        if (this.onClientSavedCallback) {
          this.onClientSavedCallback(res.data);
        }
      } else {
        throw new Error(res.error || 'Failed to save client');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  confirmDelete(id, name) {
    App.openDeleteModal(`Are you sure you want to delete client "${name}"?`, async () => {
      try {
        const res = await API.deleteClient(id);
        if (res.success) {
          showToast(`Client "${name}" deleted.`, 'success');
          Clients.loadClients();
        } else {
          throw new Error(res.error || 'Failed to delete client');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
