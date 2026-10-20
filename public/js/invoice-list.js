// ============================================================
// D-INVOICE INVOICE MANAGEMENT TABLE & ACTIONS
// ============================================================

const InvoiceList = {
  invoices: [],
  searchTimeout: null,

  async init() {
    await this.loadInvoices();
  },

  async loadInvoices() {
    const q = document.getElementById('invoiceSearchInput').value.trim();
    const status = document.getElementById('invoiceStatusFilter').value;

    const tbody = document.getElementById('invoicesTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="table-loading">Loading invoices...</td></tr>';

    try {
      const res = await API.getInvoices({ q, status });
      if (!res.success) throw new Error(res.error || 'Failed to fetch invoices');

      this.invoices = res.data || [];
      this.render();
    } catch (err) {
      console.error('Invoices list error:', err);
      tbody.innerHTML = `<tr><td colspan="8" class="table-empty text-danger">Error loading invoices: ${escapeHtml(err.message)}</td></tr>`;
    }
  },

  render() {
    const tbody = document.getElementById('invoicesTableBody');
    const countLabel = document.getElementById('invoiceCountLabel');

    countLabel.textContent = `Showing ${this.invoices.length} invoice${this.invoices.length === 1 ? '' : 's'}`;

    if (this.invoices.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No invoices found. Try adjusting your search or filters.</td></tr>';
      return;
    }

    let html = '';
    this.invoices.forEach(inv => {
      const clientDisplay = inv.client_company
        ? `<strong>${escapeHtml(inv.client_company)}</strong><br><small class="text-muted">${escapeHtml(inv.client_name)}</small>`
        : `<strong>${escapeHtml(inv.client_name || 'N/A')}</strong>`;

      const taxLabel = inv.tax_type === 'inter' ? 'IGST' : 'CGST + SGST';

      html += `
        <tr>
          <td>
            <a href="javascript:void(0)" class="font-mono font-semibold text-primary" onclick="InvoicePreview.open(${inv.id})">
              ${escapeHtml(inv.invoice_number)}
            </a>
          </td>
          <td>${clientDisplay}</td>
          <td>${formatDate(inv.invoice_date)}</td>
          <td>${formatDate(inv.due_date)}</td>
          <td><span class="badge" style="font-size: 0.75rem; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${taxLabel}</span></td>
          <td class="font-mono font-semibold">${formatCurrency(inv.total_amount)}</td>
          <td><span class="status-pill status-${inv.status}">${inv.status}</span></td>
          <td class="text-right">
            <div class="table-actions">
              <button class="btn-table-icon" title="View A4 Preview" onclick="InvoicePreview.open(${inv.id})">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
              <button class="btn-table-icon" title="Edit Invoice" onclick="App.openEditInvoice(${inv.id})">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              ${inv.status !== 'paid' ? `
                <button class="btn-table-icon" title="Record Payment" onclick="InvoiceList.openMarkPaidModal(${inv.id}, '${escapeHtml(inv.invoice_number)}')">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
              ` : `
                <button class="btn-table-icon" title="Set to Pending" onclick="InvoiceList.togglePending(${inv.id})">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line></svg>
                </button>
              `}
              <button class="btn-table-icon" title="Duplicate Invoice" onclick="InvoiceList.duplicateInvoice(${inv.id})">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <button class="btn-table-icon danger" title="Delete Invoice" onclick="InvoiceList.confirmDelete(${inv.id}, '${escapeHtml(inv.invoice_number)}')">
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
      this.loadInvoices();
    }, 250);
  },

  onFilterChange() {
    this.loadInvoices();
  },

  resetFilters() {
    document.getElementById('invoiceSearchInput').value = '';
    document.getElementById('invoiceStatusFilter').value = 'all';
    this.loadInvoices();
  },

  // Mark as Paid Modal
  openMarkPaidModal(invoiceId, invoiceNumber) {
    document.getElementById('mpInvoiceId').value = invoiceId;
    document.getElementById('mpInvoiceNumber').textContent = invoiceNumber;
    document.getElementById('mpPaymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('markPaidModal').style.display = 'flex';
  },

  closeMarkPaidModal() {
    document.getElementById('markPaidModal').style.display = 'none';
  },

  async confirmMarkPaid() {
    const id = document.getElementById('mpInvoiceId').value;
    const paymentMethod = document.getElementById('mpPaymentMethod').value;
    const paymentDate = document.getElementById('mpPaymentDate').value;

    try {
      const res = await API.updateInvoiceStatus(id, {
        status: 'paid',
        payment_method: paymentMethod,
        payment_date: paymentDate
      });

      if (res.success) {
        showToast('Invoice marked as Paid!', 'success');
        this.closeMarkPaidModal();
        this.loadInvoices();
        Dashboard.refresh();
      } else {
        throw new Error(res.error || 'Failed to update status');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async togglePending(id) {
    try {
      const res = await API.updateInvoiceStatus(id, { status: 'pending' });
      if (res.success) {
        showToast('Invoice marked as Pending', 'info');
        this.loadInvoices();
        Dashboard.refresh();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async duplicateInvoice(id) {
    try {
      const res = await API.duplicateInvoice(id);
      if (res.success) {
        showToast(`Invoice duplicated as ${res.invoice_number}!`, 'success');
        this.loadInvoices();
        Dashboard.refresh();
      } else {
        throw new Error(res.error || 'Failed to duplicate invoice');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  confirmDelete(id, invNumber) {
    App.openDeleteModal(`Are you sure you want to permanently delete invoice ${invNumber}?`, async () => {
      try {
        const res = await API.deleteInvoice(id);
        if (res.success) {
          showToast(`Invoice ${invNumber} deleted.`, 'success');
          InvoiceList.loadInvoices();
          Dashboard.refresh();
        } else {
          throw new Error(res.error || 'Failed to delete invoice');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
};
