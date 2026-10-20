const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all clients (supports search query)
router.get('/', async (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    let sql = 'SELECT * FROM clients';
    const params = [];
    if (q) {
      sql += ' WHERE name LIKE ? OR company_name LIKE ? OR email LIKE ? OR phone LIKE ? OR gstin LIKE ?';
      const term = `%${q}%`;
      params.push(term, term, term, term, term);
    }
    sql += ' ORDER BY name ASC';
    const clients = await db.query(sql, params);
    res.json({ success: true, data: clients });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single client
router.get('/:id', async (req, res) => {
  try {
    const client = await db.getOne('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }
    res.json({ success: true, data: client });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE client
router.post('/', async (req, res) => {
  try {
    const {
      name, company_name, email, phone, address_line1, address_line2,
      city, state, pincode, country, gstin, shipping_address
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Client name is required' });
    }

    const result = await db.insert(`
      INSERT INTO clients (
        name, company_name, email, phone, address_line1, address_line2,
        city, state, pincode, country, gstin, shipping_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name.trim(), company_name || '', email || '', phone || '', address_line1 || '', address_line2 || '',
      city || '', state || '', pincode || '', country || 'India', gstin || '', shipping_address || ''
    ]);

    const created = await db.getOne('SELECT * FROM clients WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE client
router.put('/:id', async (req, res) => {
  try {
    const {
      name, company_name, email, phone, address_line1, address_line2,
      city, state, pincode, country, gstin, shipping_address
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Client name is required' });
    }

    const existing = await db.getOne('SELECT id FROM clients WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    await db.execute(`
      UPDATE clients SET
        name = ?, company_name = ?, email = ?, phone = ?, address_line1 = ?, address_line2 = ?,
        city = ?, state = ?, pincode = ?, country = ?, gstin = ?, shipping_address = ?
      WHERE id = ?
    `, [
      name.trim(), company_name || '', email || '', phone || '', address_line1 || '', address_line2 || '',
      city || '', state || '', pincode || '', country || 'India', gstin || '', shipping_address || '',
      req.params.id
    ]);

    const updated = await db.getOne('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE client
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.getOne('SELECT id FROM clients WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    // Check if client has linked invoices
    const linked = await db.getOne('SELECT COUNT(*) as count FROM invoices WHERE client_id = ?', [req.params.id]);
    if (linked && linked.count > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete client because they are linked to ${linked.count} invoice(s).`
      });
    }

    await db.execute('DELETE FROM clients WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
