// ============================================================
// D-INVOICE A4 PREVIEW & PDF / PRINT CONTROLLER
// ============================================================

const InvoicePreview = {
  currentInvoice: null,

  async open(invoiceId) {
    try {
      const res = await API.getInvoice(invoiceId);
      if (!res.success) throw new Error(res.error || 'Invoice not found');
      
      this.currentInvoice = res.data;
      this.render(this.currentInvoice);

      document.getElementById('previewModalTitle').textContent = `Invoice ${this.currentInvoice.invoice_number}`;
      document.getElementById('previewModal').style.display = 'flex';
    } catch (err) {
      console.error('Invoice preview error:', err);
      showToast('Error opening invoice preview: ' + err.message, 'error');
    }
  },

  openWithDraftData(draftData) {
    this.currentInvoice = draftData;
    this.render(draftData);
    document.getElementById('previewModalTitle').textContent = `Preview — ${draftData.invoice_number || 'Draft'}`;
    document.getElementById('previewModal').style.display = 'flex';
  },

  close() {
    document.getElementById('previewModal').style.display = 'none';
  },

  render(inv) {
    const sheet = document.getElementById('invoiceA4Sheet');
    if (!sheet) return;

    const b = inv.business || {};
    const hasLogo = b.logo_url && b.logo_url.trim() !== '';

    // Check if intra or inter state
    const isInterState = inv.tax_type === 'inter';

    // Calculate line items table HTML
    let itemsHtml = '';
    (inv.items || []).forEach((item, idx) => {
      itemsHtml += `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>
            <strong>${escapeHtml(item.description)}</strong>
          </td>
          <td class="text-center font-mono">${escapeHtml(item.hsn_sac || '-')}</td>
          <td class="text-center">${parseFloat(item.quantity) || 1} ${escapeHtml(item.unit || 'Nos')}</td>
          <td class="text-right font-mono">${formatCurrency(item.unit_price)}</td>
          <td class="text-center">${parseFloat(item.discount_percent) > 0 ? parseFloat(item.discount_percent) + '%' : '-'}</td>
          <td class="text-right font-mono">${formatCurrency(item.taxable_amount)}</td>
          <td class="text-center">${parseFloat(item.tax_rate)}%</td>
          <td class="text-right font-mono font-semibold">${formatCurrency(item.total)}</td>
        </tr>
      `;
    });

    // Address construction
    const bizAddressParts = [
      b.address_line1,
      b.address_line2,
      b.city,
      b.state ? `${b.state} - ${b.pincode || ''}` : '',
      b.country || 'India'
    ].filter(Boolean).join(', ');

    const clientAddressParts = [
      inv.client_address_line1,
      inv.client_address_line2,
      inv.client_city,
      inv.client_state ? `${inv.client_state} - ${inv.client_pincode || ''}` : '',
      inv.client_country || 'India'
    ].filter(Boolean).join(', ');

    // Bank Details & UPI QR
    const hasBank = b.bank_name || b.account_number || b.ifsc_code || b.upi_id;
    let bankAndQrHtml = '';
    if (hasBank) {
      const upiQrSrc = b.upi_id
        ? generateUpiQrUrl(b.upi_id, b.account_name || b.name, inv.total_amount, inv.invoice_number)
        : '';

      bankAndQrHtml = `
        <div class="a4-bank-details">
          <div class="a4-bank-text">
            <div class="a4-box-title">Bank & Payment Details</div>
            ${b.bank_name ? `<div><strong>Bank:</strong> ${escapeHtml(b.bank_name)}</div>` : ''}
            ${b.account_name ? `<div><strong>A/C Name:</strong> ${escapeHtml(b.account_name)}</div>` : ''}
            ${b.account_number ? `<div><strong>A/C No:</strong> <span class="font-mono">${escapeHtml(b.account_number)}</span></div>` : ''}
            ${b.ifsc_code ? `<div><strong>IFSC:</strong> <span class="font-mono">${escapeHtml(b.ifsc_code)}</span></div>` : ''}
            ${b.upi_id ? `<div><strong>UPI ID:</strong> <span class="font-mono">${escapeHtml(b.upi_id)}</span></div>` : ''}
          </div>
          ${upiQrSrc ? `
            <div class="a4-upi-qr" title="Scan to pay via UPI">
              <img src="${upiQrSrc}" alt="UPI QR Code">
            </div>
          ` : ''}
        </div>
      `;
    }

    // Taxes summary breakdown
    let taxSummaryRows = '';
    if (isInterState) {
      taxSummaryRows += `
        <tr>
          <td>Integrated GST (IGST)</td>
          <td class="text-right font-mono">${formatCurrency(inv.igst_amount)}</td>
        </tr>
      `;
    } else {
      taxSummaryRows += `
        <tr>
          <td>Central GST (CGST)</td>
          <td class="text-right font-mono">${formatCurrency(inv.cgst_amount)}</td>
        </tr>
        <tr>
          <td>State GST (SGST)</td>
          <td class="text-right font-mono">${formatCurrency(inv.sgst_amount)}</td>
        </tr>
      `;
    }

    // Full A4 Template
    sheet.innerHTML = `
      <div>
        <!-- A4 Header -->
        <div class="a4-header">
          <div class="a4-biz-brand">
            ${hasLogo ? `<img src="${escapeHtml(b.logo_url)}" alt="Logo" class="a4-biz-logo">` : ''}
            <div class="a4-biz-info">
              <h2>${escapeHtml(b.name || 'Business Name')}</h2>
              <p>${escapeHtml(bizAddressParts)}</p>
              <p>
                ${b.email ? `Email: ${escapeHtml(b.email)} | ` : ''}
                ${b.phone ? `Phone: ${escapeHtml(b.phone)}` : ''}
              </p>
              <p>
                ${b.gstin ? `<strong>GSTIN:</strong> <span class="font-mono">${escapeHtml(b.gstin)}</span> | ` : ''}
                ${b.pan ? `<strong>PAN:</strong> <span class="font-mono">${escapeHtml(b.pan)}</span>` : ''}
              </p>
            </div>
          </div>

          <div class="a4-inv-title-box">
            <div class="a4-inv-badge">TAX INVOICE</div>
            <div class="a4-inv-num">${escapeHtml(inv.invoice_number)}</div>
            <div class="a4-meta-grid">
              <div class="a4-meta-row"><span>Date:</span> <strong>${formatDate(inv.invoice_date)}</strong></div>
              <div class="a4-meta-row"><span>Due Date:</span> <strong>${formatDate(inv.due_date)}</strong></div>
              ${inv.po_number ? `<div class="a4-meta-row"><span>Ref / PO:</span> <strong>${escapeHtml(inv.po_number)}</strong></div>` : ''}
              ${inv.place_of_supply ? `<div class="a4-meta-row"><span>Place of Supply:</span> <strong>${escapeHtml(inv.place_of_supply)}</strong></div>` : ''}
            </div>
          </div>
        </div>

        <!-- Bill To / Ship To Grid -->
        <div class="a4-parties-grid">
          <div class="a4-box">
            <div class="a4-box-title">Billed To</div>
            <div class="a4-client-name">${escapeHtml(inv.client_name || 'Valued Client')}</div>
            ${inv.client_company ? `<div class="a4-client-company">${escapeHtml(inv.client_company)}</div>` : ''}
            <div class="a4-box-desc">${escapeHtml(clientAddressParts || 'Address not specified')}</div>
            ${inv.client_email ? `<div class="a4-box-desc"><strong>Email:</strong> ${escapeHtml(inv.client_email)}</div>` : ''}
            ${inv.client_phone ? `<div class="a4-box-desc"><strong>Phone:</strong> ${escapeHtml(inv.client_phone)}</div>` : ''}
            ${inv.client_gstin ? `<div class="a4-box-desc"><strong>GSTIN:</strong> <span class="font-mono">${escapeHtml(inv.client_gstin)}</span></div>` : ''}
          </div>

          <div class="a4-box">
            <div class="a4-box-title">Shipping / Dispatch Details</div>
            ${inv.client_shipping_address && inv.client_shipping_address.trim() !== '' ? `
              <div class="a4-box-desc">${escapeHtml(inv.client_shipping_address)}</div>
            ` : `
              <div class="a4-box-desc">Same as billing address</div>
            `}
            <div class="a4-box-desc" style="margin-top: 6px;">
              <strong>Supply Type:</strong> ${isInterState ? 'Inter-State (IGST Applicable)' : 'Intra-State (CGST + SGST Applicable)'}
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <table class="a4-table">
          <thead>
            <tr>
              <th style="width: 30px;" class="text-center">#</th>
              <th>Item & Description</th>
              <th style="width: 75px;" class="text-center">HSN/SAC</th>
              <th style="width: 70px;" class="text-center">Qty</th>
              <th style="width: 80px;" class="text-right">Rate (₹)</th>
              <th style="width: 55px;" class="text-center">Disc</th>
              <th style="width: 85px;" class="text-right">Taxable (₹)</th>
              <th style="width: 55px;" class="text-center">GST</th>
              <th style="width: 90px;" class="text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Calculations Summary Section -->
        <div class="a4-summary-section">
          <div>
            ${bankAndQrHtml}
          </div>

          <div>
            <table class="a4-calc-table">
              <tr>
                <td>Subtotal (Taxable Amount)</td>
                <td class="text-right font-mono">${formatCurrency(inv.subtotal)}</td>
              </tr>
              ${parseFloat(inv.discount_amount) > 0 ? `
                <tr>
                  <td>Discount</td>
                  <td class="text-right font-mono text-danger">-${formatCurrency(inv.discount_amount)}</td>
                </tr>
              ` : ''}
              ${taxSummaryRows}
              ${parseFloat(inv.shipping_charges) > 0 ? `
                <tr>
                  <td>Shipping / Freight Charges</td>
                  <td class="text-right font-mono">${formatCurrency(inv.shipping_charges)}</td>
                </tr>
              ` : ''}
              ${parseFloat(inv.round_off) !== 0 ? `
                <tr>
                  <td>Round Off</td>
                  <td class="text-right font-mono">${parseFloat(inv.round_off) > 0 ? '+' : ''}${formatCurrency(inv.round_off)}</td>
                </tr>
              ` : ''}
              <tr class="a4-grand-total-row">
                <td><strong>Grand Total (₹)</strong></td>
                <td class="text-right font-mono"><strong>${formatCurrency(inv.total_amount)}</strong></td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Amount in Words -->
        <div class="a4-amount-words">
          <strong>Amount Chargeable (in words):</strong> <em>${numberToWordsINR(inv.total_amount)}</em>
        </div>
      </div>

      <!-- Footer Terms & Signatory Section -->
      <div class="a4-footer-terms-sign">
        <div class="a4-terms-box">
          ${inv.notes ? `
            <div style="margin-bottom: 6px;">
              <strong>Notes:</strong><br>${escapeHtml(inv.notes).replace(/\n/g, '<br>')}
            </div>
          ` : ''}
          ${inv.terms ? `
            <div>
              <strong>Terms & Conditions:</strong><br>${escapeHtml(inv.terms).replace(/\n/g, '<br>')}
            </div>
          ` : ''}
        </div>

        <div class="a4-sign-box">
          <div style="font-size: 8pt; font-weight: 700; color: #0f172a;">For ${escapeHtml(b.name || 'Authorized Signatory')}</div>
          <div class="a4-sign-space"></div>
          <div class="a4-sign-line">Authorized Signatory</div>
        </div>
      </div>
    `;
  },

  print() {
    window.print();
  },

  async downloadPdf() {
    const element = document.getElementById('invoiceA4Sheet');
    if (!element) return;

    const btn = document.getElementById('btnDownloadPdf');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<span>Generating PDF...</span>';

    try {
      const invNum = (this.currentInvoice && this.currentInvoice.invoice_number) || 'invoice';
      const opt = {
        margin: [8, 10, 8, 10],
        filename: `${invNum}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      if (window.html2pdf) {
        await window.html2pdf().set(opt).from(element).save();
        showToast(`Invoice ${invNum}.pdf downloaded successfully!`, 'success');
      } else {
        // Fallback to window.print() if CDN script blocked
        window.print();
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('Could not generate PDF via script, opening print dialog instead.', 'warning');
      window.print();
    } finally {
      if (btn) btn.innerHTML = origHtml;
    }
  }
};
