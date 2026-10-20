// ============================================================
// D-INVOICE DASHBOARD CONTROLLER
// ============================================================

const Dashboard = {
  async init() {
    await this.refresh();
  },

  async refresh() {
    try {
      const res = await API.getStats();
      if (!res.success) throw new Error(res.error || 'Failed to load stats');

      const data = res.data;
      const s = data.summary;

      // Update Metric Cards
      document.getElementById('statTotalAmount').textContent = formatCurrency(s.totalAmount);
      document.getElementById('statTotalCount').textContent = `${s.totalInvoices} invoice${s.totalInvoices === 1 ? '' : 's'} total`;

      document.getElementById('statPaidAmount').textContent = formatCurrency(s.paidAmount);
      document.getElementById('statPaidCount').textContent = `${s.paidCount} Paid`;
      const paidPct = s.totalAmount > 0 ? Math.round((s.paidAmount / s.totalAmount) * 100) : 0;
      document.getElementById('statPaidPercent').textContent = `${paidPct}% collected`;

      document.getElementById('statPendingAmount').textContent = formatCurrency(s.pendingAmount);
      document.getElementById('statPendingCount').textContent = `${s.pendingCount} Pending`;

      document.getElementById('statOverdueAmount').textContent = formatCurrency(s.overdueAmount);
      document.getElementById('statOverdueCount').textContent = `${s.overdueCount} Overdue`;

      // Render Monthly Trends
      this.renderTrends(data.monthlyTrend || []);

      // Render Recent Invoices
      this.renderRecentInvoices(data.recentInvoices || []);

    } catch (err) {
      console.error('Dashboard load error:', err);
      showToast('Error loading dashboard: ' + err.message, 'error');
    }
  },

  renderTrends(trends) {
    const container = document.getElementById('monthlyTrendsContainer');
    if (!container) return;

    if (!trends || trends.length === 0) {
      container.innerHTML = '<div class="table-empty">No billing history yet</div>';
      return;
    }

    const maxVal = Math.max(...trends.map(t => t.total), 1000);

    let html = '';
    trends.forEach(item => {
      const heightPct = Math.max(Math.round((item.total / maxVal) * 100), item.total > 0 ? 8 : 4);
      const paidHeightPct = item.total > 0 ? Math.round((item.paid / item.total) * 100) : 0;

      html += `
        <div class="trend-bar-col" title="${item.label}: Total ${formatCurrency(item.total)} | Paid ${formatCurrency(item.paid)}">
          <div class="trend-bar-track" style="height: 120px;">
            <div class="trend-bar-fill" style="height: ${heightPct}%;"></div>
          </div>
          <span>${item.label.split(' ')[0]}</span>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  renderRecentInvoices(invoices) {
    const tbody = document.getElementById('dashboardRecentTableBody');
    if (!tbody) return;

    if (!invoices || invoices.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No invoices found. Click "New Invoice" to create your first invoice!</td></tr>';
      return;
    }

    let html = '';
    invoices.forEach(inv => {
      const clientDisplay = inv.client_company
        ? `<strong>${escapeHtml(inv.client_company)}</strong><br><small class="text-muted">${escapeHtml(inv.client_name)}</small>`
        : `<strong>${escapeHtml(inv.client_name || 'N/A')}</strong>`;

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
                <button class="btn-table-icon" title="Mark as Paid" onclick="InvoiceList.openMarkPaidModal(${inv.id}, '${escapeHtml(inv.invoice_number)}')">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
              ` : ''}
              <button class="btn-table-icon" title="Duplicate Invoice" onclick="InvoiceList.duplicateInvoice(${inv.id})">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }
};
