const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// GET business profile
router.get('/', async (req, res) => {
  try {
    let business = await db.getOne('SELECT * FROM businesses ORDER BY id ASC LIMIT 1');
    if (!business) {
      await db.insert(`
        INSERT INTO businesses (name, country) VALUES (?, ?)
      `, ['My Business', 'India']);
      business = await db.getOne('SELECT * FROM businesses ORDER BY id ASC LIMIT 1');
    }
    res.json({ success: true, data: business });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE business profile
router.put('/', async (req, res) => {
  try {
    const {
      name, logo_url, email, phone, address_line1, address_line2,
      city, state, pincode, country, gstin, pan, bank_name,
      account_name, account_number, ifsc_code, upi_id, default_notes, default_terms
    } = req.body;

    const existing = await db.getOne('SELECT id FROM businesses ORDER BY id ASC LIMIT 1');
    if (existing) {
      await db.execute(`
        UPDATE businesses SET
          name = ?, logo_url = ?, email = ?, phone = ?, address_line1 = ?, address_line2 = ?,
          city = ?, state = ?, pincode = ?, country = ?, gstin = ?, pan = ?, bank_name = ?,
          account_name = ?, account_number = ?, ifsc_code = ?, upi_id = ?, default_notes = ?, default_terms = ?
        WHERE id = ?
      `, [
        name || 'My Business', logo_url || '', email || '', phone || '', address_line1 || '', address_line2 || '',
        city || '', state || '', pincode || '', country || 'India', gstin || '', pan || '', bank_name || '',
        account_name || '', account_number || '', ifsc_code || '', upi_id || '', default_notes || '', default_terms || '',
        existing.id
      ]);
      const updated = await db.getOne('SELECT * FROM businesses WHERE id = ?', [existing.id]);
      return res.json({ success: true, data: updated });
    } else {
      const result = await db.insert(`
        INSERT INTO businesses (
          name, logo_url, email, phone, address_line1, address_line2,
          city, state, pincode, country, gstin, pan, bank_name,
          account_name, account_number, ifsc_code, upi_id, default_notes, default_terms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name || 'My Business', logo_url || '', email || '', phone || '', address_line1 || '', address_line2 || '',
        city || '', state || '', pincode || '', country || 'India', gstin || '', pan || '', bank_name || '',
        account_name || '', account_number || '', ifsc_code || '', upi_id || '', default_notes || '', default_terms || ''
      ]);
      const created = await db.getOne('SELECT * FROM businesses WHERE id = ?', [result.insertId]);
      return res.json({ success: true, data: created });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload logo
router.post('/logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const logoUrl = `/uploads/${req.file.filename}`;
    const business = await db.getOne('SELECT id FROM businesses ORDER BY id ASC LIMIT 1');
    if (business) {
      await db.execute('UPDATE businesses SET logo_url = ? WHERE id = ?', [logoUrl, business.id]);
    }
    res.json({ success: true, logo_url: logoUrl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
