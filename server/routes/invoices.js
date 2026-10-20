const express = require('express');
const router = express.Router();
const db = require('../database');

// Helper to calculate / generate next invoice number
async function getNextInvoiceNumber() {
  const currentYear = new Date().getFullYear();
  const rows = await db.query(
    "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 10",
    [`INV-${currentYear}-%`]
  );
  let maxSeq = 0;
  for (const row of rows) {
    const parts = (row.invoice_number || '').split('-');
    if (parts.length === 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `INV-${currentYear}-${nextSeq}`;
}

// GET next invoice number
router.get('/next-number', async (req, res) => {
  try {
    const nextNumber = await getNextInvoiceNumber();
    res.json({ success: true, next_number: nextNumber });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all invoices with filters
router.get('/', async (req, res) => {
  try {
    const { q, status, from, to } = req.query;
    let sql = `
      SELECT 
        i.*,
        c.name as client_name,
        c.company_name as client_company,
        c.email as client_email,
        c.phone as client_phone,
        c.gstin as client_gstin,
        c.state as client_state
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND i.status = ?';
      params.push(status);
    }

    if (from) {
      sql += ' AND i.invoice_date >= ?';
      params.push(from);
    }

    if (to) {
      sql += ' AND i.invoice_date <= ?';
      params.push(to);
    }

    if (q) {
      const term = `%${q.trim()}%`;
      sql += ' AND (i.invoice_number LIKE ? OR c.name LIKE ? OR c.company_name LIKE ? OR i.po_number LIKE ?)';
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY i.id DESC';
    const invoices = await db.query(sql, params);

    // Auto-update overdue status dynamically if due date passed and status is pending
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedInvoices = invoices.map(inv => {
      if (inv.status === 'pending' && inv.due_date && inv.due_date < todayStr) {
        return { ...inv, is_overdue: true, status: 'overdue' };
      }
      return inv;
    });

    res.json({ success: true, data: updatedInvoices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single invoice with items and business details
router.get('/:id', async (req, res) => {
  try {
    const invoice = await db.getOne(`
      SELECT 
        i.*,
        c.name as client_name,
        c.company_name as client_company,
        c.email as client_email,
        c.phone as client_phone,
        c.address_line1 as client_address_line1,
        c.address_line2 as client_address_line2,
        c.city as client_city,
        c.state as client_state,
        c.pincode as client_pincode,
        c.country as client_country,
        c.gstin as client_gstin,
        c.shipping_address as client_shipping_address
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Get business details
    const business = await db.getOne('SELECT * FROM businesses ORDER BY id ASC LIMIT 1');

    // Get line items
    const items = await db.query(
      'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC, id ASC',
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...invoice,
        business: business || {},
        items: items || []
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE invoice
router.post('/', async (req, res) => {
  try {
    const {
      invoice_number, client_id, invoice_date, due_date, po_number,
      place_of_supply, status, payment_method, payment_date,
      subtotal, discount_type, discount_value, discount_amount,
      tax_type, cgst_amount, sgst_amount, igst_amount, total_tax,
      shipping_charges, round_off, total_amount, notes, terms, items
    } = req.body;

    if (!invoice_number) {
      return res.status(400).json({ success: false, error: 'Invoice number is required' });
    }
    if (!invoice_date || !due_date) {
      return res.status(400).json({ success: false, error: 'Invoice date and due date are required' });
    }
    if (!items || !items.length) {
      return res.status(400).json({ success: false, error: 'At least one invoice item is required' });
    }

    // Check duplicate invoice number
    const existing = await db.getOne('SELECT id FROM invoices WHERE invoice_number = ?', [invoice_number]);
    if (existing) {
      return res.status(400).json({ success: false, error: `Invoice number ${invoice_number} already exists` });
    }

    const business = await db.getOne('SELECT id FROM businesses ORDER BY id ASC LIMIT 1');
    const businessId = business ? business.id : 1;

    const invResult = await db.insert(`
      INSERT INTO invoices (
        invoice_number, business_id, client_id, invoice_date, due_date,
        po_number, place_of_supply, status, payment_method, payment_date,
        subtotal, discount_type, discount_value, discount_amount,
        tax_type, cgst_amount, sgst_amount, igst_amount, total_tax,
        shipping_charges, round_off, total_amount, notes, terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoice_number, businessId, client_id || null, invoice_date, due_date,
      po_number || '', place_of_supply || '', status || 'pending', payment_method || '', payment_date || null,
      subtotal || 0, discount_type || 'fixed', discount_value || 0, discount_amount || 0,
      tax_type || 'intra', cgst_amount || 0, sgst_amount || 0, igst_amount || 0, total_tax || 0,
      shipping_charges || 0, round_off || 0, total_amount || 0, notes || '', terms || ''
    ]);

    const newInvoiceId = invResult.insertId;

    // Insert items
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await db.insert(`
        INSERT INTO invoice_items (
          invoice_id, description, hsn_sac, quantity, unit, unit_price,
          discount_percent, tax_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, total, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newInvoiceId, it.description || 'Item', it.hsn_sac || '', it.quantity || 1, it.unit || 'Nos',
        it.unit_price || 0, it.discount_percent || 0, it.tax_rate || 0, it.taxable_amount || 0,
        it.cgst_amount || 0, it.sgst_amount || 0, it.igst_amount || 0, it.total || 0, i + 1
      ]);
    }

    res.status(201).json({ success: true, invoice_id: newInvoiceId, message: 'Invoice created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE invoice
router.put('/:id', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const existing = await db.getOne('SELECT id, invoice_number FROM invoices WHERE id = ?', [invoiceId]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const {
      invoice_number, client_id, invoice_date, due_date, po_number,
      place_of_supply, status, payment_method, payment_date,
      subtotal, discount_type, discount_value, discount_amount,
      tax_type, cgst_amount, sgst_amount, igst_amount, total_tax,
      shipping_charges, round_off, total_amount, notes, terms, items
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, error: 'At least one invoice item is required' });
    }

    // Check duplicate invoice number if changed
    if (invoice_number !== existing.invoice_number) {
      const dup = await db.getOne('SELECT id FROM invoices WHERE invoice_number = ? AND id != ?', [invoice_number, invoiceId]);
      if (dup) {
        return res.status(400).json({ success: false, error: `Invoice number ${invoice_number} is already in use` });
      }
    }

    await db.execute(`
      UPDATE invoices SET
        invoice_number = ?, client_id = ?, invoice_date = ?, due_date = ?,
        po_number = ?, place_of_supply = ?, status = ?, payment_method = ?, payment_date = ?,
        subtotal = ?, discount_type = ?, discount_value = ?, discount_amount = ?,
        tax_type = ?, cgst_amount = ?, sgst_amount = ?, igst_amount = ?, total_tax = ?,
        shipping_charges = ?, round_off = ?, total_amount = ?, notes = ?, terms = ?
      WHERE id = ?
    `, [
      invoice_number, client_id || null, invoice_date, due_date,
      po_number || '', place_of_supply || '', status || 'pending', payment_method || '', payment_date || null,
      subtotal || 0, discount_type || 'fixed', discount_value || 0, discount_amount || 0,
      tax_type || 'intra', cgst_amount || 0, sgst_amount || 0, igst_amount || 0, total_tax || 0,
      shipping_charges || 0, round_off || 0, total_amount || 0, notes || '', terms || '',
      invoiceId
    ]);

    // Replace items
    await db.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [invoiceId]);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await db.insert(`
        INSERT INTO invoice_items (
          invoice_id, description, hsn_sac, quantity, unit, unit_price,
          discount_percent, tax_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, total, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceId, it.description || 'Item', it.hsn_sac || '', it.quantity || 1, it.unit || 'Nos',
        it.unit_price || 0, it.discount_percent || 0, it.tax_rate || 0, it.taxable_amount || 0,
        it.cgst_amount || 0, it.sgst_amount || 0, it.igst_amount || 0, it.total || 0, i + 1
      ]);
    }

    res.json({ success: true, invoice_id: invoiceId, message: 'Invoice updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// QUICK STATUS UPDATE
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, payment_method, payment_date } = req.body;
    const invoice = await db.getOne('SELECT id FROM invoices WHERE id = ?', [req.params.id]);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const payDate = status === 'paid' ? (payment_date || new Date().toISOString().split('T')[0]) : null;
    const payMethod = status === 'paid' ? (payment_method || 'Bank Transfer') : '';

    await db.execute(`
      UPDATE invoices SET status = ?, payment_method = ?, payment_date = ? WHERE id = ?
    `, [status, payMethod, payDate, req.params.id]);

    res.json({ success: true, message: `Invoice status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DUPLICATE invoice
router.post('/:id/duplicate', async (req, res) => {
  try {
    const orig = await db.getOne('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!orig) {
      return res.status(404).json({ success: false, error: 'Original invoice not found' });
    }

    const nextNumber = await getNextInvoiceNumber();
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const result = await db.insert(`
      INSERT INTO invoices (
        invoice_number, business_id, client_id, invoice_date, due_date,
        po_number, place_of_supply, status, payment_method, payment_date,
        subtotal, discount_type, discount_value, discount_amount,
        tax_type, cgst_amount, sgst_amount, igst_amount, total_tax,
        shipping_charges, round_off, total_amount, notes, terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nextNumber, orig.business_id, orig.client_id, today, dueDateStr,
      orig.po_number, orig.place_of_supply, 'draft', '', null,
      orig.subtotal, orig.discount_type, orig.discount_value, orig.discount_amount,
      orig.tax_type, orig.cgst_amount, orig.sgst_amount, orig.igst_amount, orig.total_tax,
      orig.shipping_charges, orig.round_off, orig.total_amount, orig.notes, orig.terms
    ]);

    const newInvoiceId = result.insertId;

    const items = await db.query('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC', [req.params.id]);
    for (const it of items) {
      await db.insert(`
        INSERT INTO invoice_items (
          invoice_id, description, hsn_sac, quantity, unit, unit_price,
          discount_percent, tax_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, total, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newInvoiceId, it.description, it.hsn_sac, it.quantity, it.unit,
        it.unit_price, it.discount_percent, it.tax_rate, it.taxable_amount,
        it.cgst_amount, it.sgst_amount, it.igst_amount, it.total, it.sort_order
      ]);
    }

    res.status(201).json({ success: true, invoice_id: newInvoiceId, invoice_number: nextNumber, message: 'Invoice duplicated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE invoice
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.getOne('SELECT id, invoice_number FROM invoices WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    await db.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [req.params.id]);
    await db.execute('DELETE FROM invoices WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: `Invoice ${existing.invoice_number} deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
