// ============================================================
// D-INVOICE INVOICE FORM & TAX CALCULATION ENGINE
// ============================================================

const InvoiceForm = {
  currentBusiness: null,
  allClients: [],
  selectedClient: null,
  items: [],

  async init(editInvoiceId = null) {
    this.populateStateDropdowns();
    await this.loadInitialData();

    if (editInvoiceId) {
      await this.loadForEdit(editInvoiceId);
    } else {
      this.resetForm();
      await this.generateNextNumber();
    }
  },

  populateStateDropdowns() {
    const supplySelect = document.getElementById('invPlaceOfSupply');
    if (!supplySelect) return;

    supplySelect.innerHTML = INDIAN_STATES.map(s => `<option value="${s}">${s}</option>`).join('');
  },

  async loadInitialData() {
    try {
      const [bizRes, clientsRes] = await Promise.all([
        API.getBusiness(),
        API.getClients()
      ]);

      if (bizRes.success) {
        this.currentBusiness = bizRes.data;
      }

      if (clientsRes.success) {
        this.allClients = clientsRes.data;
        this.populateClientSelect();
      }
    } catch (err) {
      console.error('Error loading initial invoice form data:', err);
    }
  },

  populateClientSelect() {
    const select = document.getElementById('invClientSelect');
    if (!select) return;

    let html = '<option value="">-- Choose Client --</option>';
    this.allClients.forEach(c => {
      const display = c.company_name ? `${c.name} (${c.company_name})` : c.name;
      html += `<option value="${c.id}">${escapeHtml(display)}</option>`;
    });
    select.innerHTML = html;
  },

  resetForm() {
    document.getElementById('invoiceFormTitle').textContent = 'New Invoice';
    document.getElementById('formInvoiceId').value = '';
    
    // Set dates
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    document.getElementById('invDate').value = today;
    document.getElementById('invDueDate').value = dueDateStr;
    document.getElementById('invPoNumber').value = '';
    document.getElementById('invStatus').value = 'pending';

    // Place of supply defaults to business state
    const defaultState = (this.currentBusiness && this.currentBusiness.state) || 'Karnataka';
    document.getElementById('invPlaceOfSupply').value = defaultState;

    // Reset client
    this.selectedClient = null;
    document.getElementById('invClientSelect').value = '';
    this.updateClientPreview(null);

    // Default notes & terms from business profile
    document.getElementById('invNotes').value = (this.currentBusiness && this.currentBusiness.default_notes) || '';
    document.getElementById('invTerms').value = (this.currentBusiness && this.currentBusiness.default_terms) || '';

    // Calculations inputs
    document.getElementById('calcDiscountType').value = 'fixed';
    document.getElementById('calcDiscountValue').value = '0';
    document.getElementById('calcShipping').value = '0';

    // Clear items and add initial 2 rows
    const tbody = document.getElementById('itemsTableBody');
    tbody.innerHTML = '';
    this.addItemRow({ description: '', hsn_sac: '', quantity: 1, unit: 'Nos', unit_price: 0, discount_percent: 0, tax_rate: 18 });
  },

  async generateNextNumber() {
    try {
      const res = await API.getNextInvoiceNumber();
      if (res.success && res.next_number) {
        document.getElementById('invNumber').value = res.next_number;
      }
    } catch (err) {
      console.warn('Could not auto-generate invoice number:', err);
    }
  },

  onInvoiceDateChange() {
    const invDateVal = document.getElementById('invDate').value;
    if (!invDateVal) return;
    // Default to +15 days
    const d = new Date(invDateVal);
    d.setDate(d.getDate() + 15);
    document.getElementById('invDueDate').value = d.toISOString().split('T')[0];
  },

  setPaymentTerms(days) {
    const invDateVal = document.getElementById('invDate').value || new Date().toISOString().split('T')[0];
    const d = new Date(invDateVal);
    d.setDate(d.getDate() + days);
    document.getElementById('invDueDate').value = d.toISOString().split('T')[0];
  },

  onClientSelected(clientId) {
    if (!clientId) {
      this.selectedClient = null;
      this.updateClientPreview(null);
      this.calculateTotals();
      return;
    }

    const client = this.allClients.find(c => String(c.id) === String(clientId));
    this.selectedClient = client || null;
    this.updateClientPreview(this.selectedClient);

    // Auto set Place of Supply to Client's State if available
    if (client && client.state) {
      document.getElementById('invPlaceOfSupply').value = client.state;
    }

    this.calculateTotals();
  },

  onNewClientCreated(newClient) {
    InvoiceForm.allClients.push(newClient);
    InvoiceForm.populateClientSelect();
    document.getElementById('invClientSelect').value = newClient.id;
    InvoiceForm.onClientSelected(newClient.id);
  },

  updateClientPreview(client) {
    const boxDetails = document.getElementById('clientPreviewDetails');
    const boxEmpty = document.querySelector('.client-preview-empty');

    if (!client) {
      boxDetails.style.display = 'none';
      boxEmpty.style.display = 'block';
      return;
    }

    boxEmpty.style.display = 'none';
    boxDetails.style.display = 'block';

    document.getElementById('cpName').textContent = client.name || 'Unnamed Client';
    document.getElementById('cpCompany').textContent = client.company_name || '';
    document.getElementById('cpEmail').textContent = client.email || '-';
    document.getElementById('cpPhone').textContent = client.phone || '-';

    const addr = [client.address_line1, client.city, client.state, client.pincode].filter(Boolean).join(', ');
    document.getElementById('cpAddress').textContent = addr || '-';
    document.getElementById('cpGstin').textContent = client.gstin || 'None';
    document.getElementById('cpState').textContent = client.state || '-';
  },

  onPlaceOfSupplyChange() {
    this.calculateTotals();
  },

  // Dynamic Item Rows
  addItemRow(data = {}) {
    const tbody = document.getElementById('itemsTableBody');
    if (!tbody) return;

    const rowIdx = tbody.children.length + 1;
    const tr = document.createElement('tr');
    tr.className = 'item-row';

    const desc = escapeHtml(data.description || '');
    const hsn = escapeHtml(data.hsn_sac || '');
    const qty = data.quantity !== undefined ? data.quantity : 1;
    const unit = escapeHtml(data.unit || 'Nos');
    const rate = data.unit_price !== undefined ? data.unit_price : 0;
    const disc = data.discount_percent !== undefined ? data.discount_percent : 0;
    const tax = data.tax_rate !== undefined ? data.tax_rate : 18;

    tr.innerHTML = `
      <td class="row-index text-center">${rowIdx}</td>
      <td>
        <input type="text" class="form-control item-desc" required placeholder="Product or service name..." value="${desc}">
      </td>
      <td>
        <input type="text" class="form-control item-hsn text-center font-mono" placeholder="HSN/SAC" value="${hsn}">
      </td>
      <td>
        <input type="number" class="form-control item-qty text-center" min="0.01" step="any" value="${qty}" oninput="InvoiceForm.calculateTotals()">
      </td>
      <td>
        <select class="form-control item-unit">
          <option value="Nos" ${unit === 'Nos' ? 'selected' : ''}>Nos</option>
          <option value="Hours" ${unit === 'Hours' ? 'selected' : ''}>Hours</option>
          <option value="Days" ${unit === 'Days' ? 'selected' : ''}>Days</option>
          <option value="Units" ${unit === 'Units' ? 'selected' : ''}>Units</option>
          <option value="Pcs" ${unit === 'Pcs' ? 'selected' : ''}>Pcs</option>
          <option value="Kg" ${unit === 'Kg' ? 'selected' : ''}>Kg</option>
          <option value="Month" ${unit === 'Month' ? 'selected' : ''}>Month</option>
          <option value="Project" ${unit === 'Project' ? 'selected' : ''}>Project</option>
          <option value="Service" ${unit === 'Service' ? 'selected' : ''}>Service</option>
        </select>
      </td>
      <td>
        <input type="number" class="form-control item-rate text-right font-mono" min="0" step="0.01" value="${rate}" oninput="InvoiceForm.calculateTotals()">
      </td>
      <td>
        <input type="number" class="form-control item-disc text-center font-mono" min="0" max="100" step="any" value="${disc}" oninput="InvoiceForm.calculateTotals()">
      </td>
      <td>
        <select class="form-control item-tax text-center font-mono" onchange="InvoiceForm.calculateTotals()">
          <option value="0" ${tax == 0 ? 'selected' : ''}>0% (Exempt)</option>
          <option value="5" ${tax == 5 ? 'selected' : ''}>5% GST</option>
          <option value="12" ${tax == 12 ? 'selected' : ''}>12% GST</option>
          <option value="18" ${tax == 18 ? 'selected' : ''}>18% GST</option>
          <option value="28" ${tax == 28 ? 'selected' : ''}>28% GST</option>
        </select>
      </td>
      <td class="text-right font-mono item-taxable">₹0.00</td>
      <td class="text-right font-mono font-semibold item-total">₹0.00</td>
      <td class="text-center">
        <button type="button" class="btn-remove-row" title="Remove Row" onclick="InvoiceForm.removeItemRow(this)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
    this.reindexRows();
    this.calculateTotals();
  },

  removeItemRow(btn) {
    const tbody = document.getElementById('itemsTableBody');
    if (tbody.children.length <= 1) {
      showToast('An invoice must have at least one line item', 'warning');
      return;
    }
    btn.closest('tr').remove();
    this.reindexRows();
    this.calculateTotals();
  },

  reindexRows() {
    const rows = document.querySelectorAll('#itemsTableBody tr');
    rows.forEach((r, i) => {
      const idxCell = r.querySelector('.row-index');
      if (idxCell) idxCell.textContent = i + 1;
    });
  },

  // Calculate Totals, GST (CGST/SGST vs IGST), Discounts, and Payable Amount
  calculateTotals() {
    const rows = document.querySelectorAll('#itemsTableBody tr');
    
    // Determine GST Type:
    // If supplier state == place of supply -> Intra (CGST + SGST)
    // If supplier state != place of supply -> Inter (IGST)
    const bizState = (this.currentBusiness && this.currentBusiness.state) || 'Karnataka';
    const placeOfSupply = document.getElementById('invPlaceOfSupply').value || bizState;
    const isInterState = bizState.trim().toLowerCase() !== placeOfSupply.trim().toLowerCase();

    // Update tax indicator badge
    const badge = document.getElementById('taxTypeBadge');
    const hint = document.getElementById('taxTypeHint');
    if (isInterState) {
      badge.textContent = 'Inter-State GST (IGST)';
      hint.textContent = `Supply from ${bizState} to ${placeOfSupply}. Applies full IGST.`;
    } else {
      badge.textContent = 'Intra-State GST (CGST + SGST)';
      hint.textContent = `Both Business & Supply in ${bizState}. Splits tax equally into CGST + SGST.`;
    }

    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    rows.forEach(r => {
      const qty = parseFloat(r.querySelector('.item-qty').value) || 0;
      const rate = parseFloat(r.querySelector('.item-rate').value) || 0;
      const discPct = parseFloat(r.querySelector('.item-disc').value) || 0;
      const taxRate = parseFloat(r.querySelector('.item-tax').value) || 0;

      const gross = qty * rate;
      const discount = gross * (discPct / 100);
      const taxable = Math.max(0, gross - discount);

      let lineCgst = 0;
      let lineSgst = 0;
      let lineIgst = 0;

      if (isInterState) {
        lineIgst = taxable * (taxRate / 100);
      } else {
        lineCgst = taxable * ((taxRate / 2) / 100);
        lineSgst = taxable * ((taxRate / 2) / 100);
      }

      const lineTotal = taxable + lineCgst + lineSgst + lineIgst;

      r.querySelector('.item-taxable').textContent = formatCurrency(taxable);
      r.querySelector('.item-total').textContent = formatCurrency(lineTotal);

      subtotal += taxable;
      totalCgst += lineCgst;
      totalSgst += lineSgst;
      totalIgst += lineIgst;
    });

    // Overall Discount
    const discType = document.getElementById('calcDiscountType').value;
    const discVal = parseFloat(document.getElementById('calcDiscountValue').value) || 0;
    let overallDiscAmount = 0;

    if (discType === 'percent') {
      overallDiscAmount = subtotal * (discVal / 100);
    } else {
      overallDiscAmount = Math.min(discVal, subtotal);
    }

    const discRow = document.getElementById('calcDiscountRow');
    if (overallDiscAmount > 0) {
      discRow.style.display = 'flex';
      document.getElementById('calcDiscountAmount').textContent = `-${formatCurrency(overallDiscAmount)}`;
    } else {
      discRow.style.display = 'none';
    }

    // Shipping
    const shipping = parseFloat(document.getElementById('calcShipping').value) || 0;

    // Total tax
    const totalTax = totalCgst + totalSgst + totalIgst;

    // Grand total before round-off
    const rawTotal = (subtotal - overallDiscAmount) + totalTax + shipping;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = roundedTotal - rawTotal;

    // Display summary
    document.getElementById('calcSubtotal').textContent = formatCurrency(subtotal);

    const cgstRow = document.getElementById('cgstRow');
    const sgstRow = document.getElementById('sgstRow');
    const igstRow = document.getElementById('igstRow');

    if (isInterState) {
      cgstRow.style.display = 'none';
      sgstRow.style.display = 'none';
      igstRow.style.display = 'flex';
      document.getElementById('calcIgst').textContent = formatCurrency(totalIgst);
    } else {
      cgstRow.style.display = 'flex';
      sgstRow.style.display = 'flex';
      igstRow.style.display = 'none';
      document.getElementById('calcCgst').textContent = formatCurrency(totalCgst);
      document.getElementById('calcSgst').textContent = formatCurrency(totalSgst);
    }

    document.getElementById('calcTotalTax').textContent = formatCurrency(totalTax);
    document.getElementById('calcRoundOff').textContent = (roundOff >= 0 ? '+' : '') + formatCurrency(roundOff);
    document.getElementById('calcGrandTotal').textContent = formatCurrency(roundedTotal);

    // Amount in Words
    document.getElementById('calcAmountWords').textContent = numberToWordsINR(roundedTotal);

    return {
      subtotal,
      discount_type: discType,
      discount_value: discVal,
      discount_amount: overallDiscAmount,
      tax_type: isInterState ? 'inter' : 'intra',
      cgst_amount: totalCgst,
      sgst_amount: totalSgst,
      igst_amount: totalIgst,
      total_tax: totalTax,
      shipping_charges: shipping,
      round_off: roundOff,
      total_amount: roundedTotal
    };
  },

  // Gather current invoice payload
  getFormData() {
    const invNumber = document.getElementById('invNumber').value.trim();
    const invDate = document.getElementById('invDate').value;
    const invDueDate = document.getElementById('invDueDate').value;
    const poNumber = document.getElementById('invPoNumber').value.trim();
    const placeOfSupply = document.getElementById('invPlaceOfSupply').value;
    const status = document.getElementById('invStatus').value;
    const clientId = document.getElementById('invClientSelect').value;

    const notes = document.getElementById('invNotes').value;
    const terms = document.getElementById('invTerms').value;

    const calc = this.calculateTotals();

    // Items
    const rows = document.querySelectorAll('#itemsTableBody tr');
    const items = [];
    const isInterState = calc.tax_type === 'inter';

    rows.forEach(r => {
      const desc = r.querySelector('.item-desc').value.trim();
      const hsn = r.querySelector('.item-hsn').value.trim();
      const qty = parseFloat(r.querySelector('.item-qty').value) || 1;
      const unit = r.querySelector('.item-unit').value;
      const rate = parseFloat(r.querySelector('.item-rate').value) || 0;
      const disc = parseFloat(r.querySelector('.item-disc').value) || 0;
      const taxRate = parseFloat(r.querySelector('.item-tax').value) || 0;

      const gross = qty * rate;
      const discount = gross * (disc / 100);
      const taxable = Math.max(0, gross - discount);

      let cgst = 0, sgst = 0, igst = 0;
      if (isInterState) {
        igst = taxable * (taxRate / 100);
      } else {
        cgst = taxable * ((taxRate / 2) / 100);
        sgst = taxable * ((taxRate / 2) / 100);
      }

      items.push({
        description: desc,
        hsn_sac: hsn,
        quantity: qty,
        unit,
        unit_price: rate,
        discount_percent: disc,
        tax_rate: taxRate,
        taxable_amount: taxable,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        total: taxable + cgst + sgst + igst
      });
    });

    return {
      invoice_number: invNumber,
      client_id: clientId ? parseInt(clientId, 10) : null,
      invoice_date: invDate,
      due_date: invDueDate,
      po_number: poNumber,
      place_of_supply: placeOfSupply,
      status,
      ...calc,
      notes,
      terms,
      items
    };
  },

  // Save invoice (create or update)
  async save(previewAfter = false) {
    const payload = this.getFormData();

    if (!payload.invoice_number) {
      showToast('Please enter an invoice number', 'warning');
      return;
    }
    if (!payload.client_id) {
      showToast('Please select a client', 'warning');
      return;
    }
    if (!payload.items || payload.items.length === 0) {
      showToast('Please add at least one line item', 'warning');
      return;
    }

    const firstInvalid = payload.items.find(it => !it.description);
    if (firstInvalid) {
      showToast('Item description cannot be empty', 'warning');
      return;
    }

    const invoiceId = document.getElementById('formInvoiceId').value;

    try {
      let res;
      if (invoiceId) {
        res = await API.updateInvoice(invoiceId, payload);
      } else {
        res = await API.createInvoice(payload);
      }

      if (res.success) {
        showToast(`Invoice ${payload.invoice_number} saved successfully!`, 'success');
        const targetId = invoiceId || res.invoice_id;

        if (previewAfter) {
          InvoicePreview.open(targetId);
        } else {
          App.navigateTo('invoices');
        }
      } else {
        throw new Error(res.error || 'Failed to save invoice');
      }
    } catch (err) {
      console.error('Invoice save error:', err);
      showToast(err.message, 'error');
    }
  },

  // Live draft preview without saving
  previewDraft() {
    const payload = this.getFormData();
    payload.business = this.currentBusiness || {};

    const client = this.allClients.find(c => String(c.id) === String(payload.client_id)) || {};
    payload.client_name = client.name || 'Valued Client';
    payload.client_company = client.company_name || '';
    payload.client_email = client.email || '';
    payload.client_phone = client.phone || '';
    payload.client_address_line1 = client.address_line1 || '';
    payload.client_city = client.city || '';
    payload.client_state = client.state || '';
    payload.client_pincode = client.pincode || '';
    payload.client_gstin = client.gstin || '';

    InvoicePreview.openWithDraftData(payload);
  },

  // Load existing invoice for editing
  async loadForEdit(invoiceId) {
    try {
      const res = await API.getInvoice(invoiceId);
      if (!res.success) throw new Error(res.error || 'Invoice not found');

      const inv = res.data;
      document.getElementById('invoiceFormTitle').textContent = `Edit Invoice ${inv.invoice_number}`;
      document.getElementById('formInvoiceId').value = inv.id;

      document.getElementById('invNumber').value = inv.invoice_number;
      document.getElementById('invPoNumber').value = inv.po_number || '';
      document.getElementById('invDate').value = inv.invoice_date.split('T')[0];
      document.getElementById('invDueDate').value = inv.due_date.split('T')[0];
      document.getElementById('invStatus').value = inv.status;
      document.getElementById('invPlaceOfSupply').value = inv.place_of_supply || 'Karnataka';

      if (inv.client_id) {
        document.getElementById('invClientSelect').value = inv.client_id;
        this.onClientSelected(inv.client_id);
      }

      document.getElementById('invNotes').value = inv.notes || '';
      document.getElementById('invTerms').value = inv.terms || '';

      document.getElementById('calcDiscountType').value = inv.discount_type || 'fixed';
      document.getElementById('calcDiscountValue').value = inv.discount_value || 0;
      document.getElementById('calcShipping').value = inv.shipping_charges || 0;

      // Populate items
      const tbody = document.getElementById('itemsTableBody');
      tbody.innerHTML = '';
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach(it => this.addItemRow(it));
      } else {
        this.addItemRow();
      }

      this.calculateTotals();
    } catch (err) {
      console.error('Error loading invoice for edit:', err);
      showToast('Error loading invoice: ' + err.message, 'error');
    }
  }
};
