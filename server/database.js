const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let currentEngine = 'sqlite';
let mysqlPool = null;
let sqliteDb = null;
let connectionStatus = {
  engine: 'sqlite',
  connected: false,
  message: 'Initializing...',
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME || 'dinvoice_db',
  port: process.env.DB_PORT || 3306
};

// Seed sample data if empty
async function seedDefaultData() {
  const businessCount = await getOne('SELECT COUNT(*) as count FROM businesses');
  if (businessCount && businessCount.count === 0) {
    console.log('Seeding initial business profile...');
    await insert(`
      INSERT INTO businesses (
        name, logo_url, email, phone, address_line1, address_line2, 
        city, state, pincode, country, gstin, pan, bank_name, 
        account_name, account_number, ifsc_code, upi_id, default_notes, default_terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'TechNova Innovations Pvt Ltd',
      '',
      'billing@technovainnovations.com',
      '+91 98765 43210',
      'Tower B, 4th Floor, Cyber Tech Park',
      'Electronic City Phase 1',
      'Bengaluru',
      'Karnataka',
      '560100',
      'India',
      '29AAACT9876Q1Z5',
      'AAACT9876Q',
      'HDFC Bank',
      'TechNova Innovations Private Limited',
      '50200049283719',
      'HDFC0000240',
      'technova@okhdfcbank',
      'Thank you for your business. We appreciate your timely collaboration!',
      '1. Payment is due within 15 days of invoice issue.\n2. Please mention the invoice number in the bank transfer reference.\n3. Late payments will incur 1.5% interest per month.\n4. Subject to Bengaluru jurisdiction.'
    ]);
  }

  const clientCount = await getOne('SELECT COUNT(*) as count FROM clients');
  if (clientCount && clientCount.count === 0) {
    console.log('Seeding initial clients...');
    await insert(`
      INSERT INTO clients (name, company_name, email, phone, address_line1, address_line2, city, state, pincode, country, gstin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Rajesh Sharma',
      'Zenith Cloud Technologies',
      'accounts@zenithcloud.in',
      '+91 98234 56789',
      'Plot 42, Hinjewadi Phase 2',
      'IT Park Road',
      'Pune',
      'Maharashtra',
      '411057',
      'India',
      '27AABCZ1234F1Z8'
    ]);

    await insert(`
      INSERT INTO clients (name, company_name, email, phone, address_line1, address_line2, city, state, pincode, country, gstin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Priya Nambiar',
      'Global FinServe Solutions',
      'billing@globalfinserve.com',
      '+91 94471 23456',
      '6th Floor, Infopark Building',
      'Kakkanad',
      'Kochi',
      'Kerala',
      '682042',
      'India',
      '32AABCG5432D1Z3'
    ]);

    await insert(`
      INSERT INTO clients (name, company_name, email, phone, address_line1, address_line2, city, state, pincode, country, gstin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Anand Rao',
      'Namma Bengaluru Media LLP',
      'finance@nammabangalore.in',
      '+91 98450 11223',
      '12, 100 Feet Road',
      'Indiranagar',
      'Bengaluru',
      'Karnataka',
      '560038',
      'India',
      '29AABCN9988E1Z1'
    ]);
  }

  const invoiceCount = await getOne('SELECT COUNT(*) as count FROM invoices');
  if (invoiceCount && invoiceCount.count === 0) {
    console.log('Seeding demo invoices...');
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];
    
    const d1 = new Date(today);
    d1.setDate(d1.getDate() - 10);
    const due1 = new Date(d1);
    due1.setDate(due1.getDate() + 15);

    const d2 = new Date(today);
    d2.setDate(d2.getDate() - 2);
    const due2 = new Date(d2);
    due2.setDate(due2.getDate() + 14);

    const d3 = new Date(today);
    d3.setDate(d3.getDate() - 25);
    const due3 = new Date(d3);
    due3.setDate(due3.getDate() + 10);

    // Invoice 1: Paid (Inter-state IGST: Karnataka to Maharashtra)
    const inv1Res = await insert(`
      INSERT INTO invoices (
        invoice_number, business_id, client_id, invoice_date, due_date, 
        po_number, place_of_supply, status, payment_method, payment_date,
        subtotal, discount_type, discount_value, discount_amount, tax_type,
        cgst_amount, sgst_amount, igst_amount, total_tax, shipping_charges, round_off, total_amount, notes, terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'INV-2026-0001', 1, 1, formatDate(d1), formatDate(due1),
      'PO-ZEN-882', 'Maharashtra', 'paid', 'Bank Transfer (NEFT)', formatDate(d1),
      65000.00, 'fixed', 0, 0, 'inter',
      0.00, 0.00, 11700.00, 11700.00, 0, 0, 76700.00,
      'Thank you for partnering with TechNova!', 'Net 15 days payment terms.'
    ]);

    await insert(`
      INSERT INTO invoice_items (invoice_id, description, hsn_sac, quantity, unit, unit_price, discount_percent, tax_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, total, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [inv1Res.insertId, 'Enterprise Cloud Infrastructure Architecture & Setup', '998313', 1, 'Project', 45000.00, 0, 18, 45000.00, 0, 0, 8100.00, 53100.00, 1]);

    await insert(`
      INSERT INTO invoice_items (invoice_id, description, hsn_sac, quantity, unit, unit_price, discount_percent, tax_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, total, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [inv1Res.insertId, 'Security Audit & Compliance Hardening', '998315', 1, 'Service', 20000.00, 0, 18, 20000.00, 0, 0, 3600.00, 23600.00, 2]);

    // Invoice 2: Pending (Intra-state CGST + SGST: Karnataka to Karnataka)
    const inv2Res = await insert(`
      INSERT INTO invoices (
        invoice_number, business_id, client_id, invoice_date, due_date, 
        po_number, place_of_supply, status, payment_method, payment_date,
        subtotal, discount_type, discount_value, discount_amount, tax_type,
        cgst_amount, sgst_amount, igst_amount, total_tax, shipping_charges, round_off, total_amount, notes, terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'INV-2026-0002', 1, 3, formatDate(d2), formatDate(due2),
      'PO-NBM-104', 'Karnataka', 'pending', '', null,
      48000.00, 'percent', 5, 2400.00, 'intra',
      4104.00, 4104.00, 0.00, 8208.00, 0, 0, 53808.00,
      'Invoice for Q4 Digital Portal Development', 'Standard terms apply.'
    ]);

    await insert(`
      INSERT INTO invoice_items (invoice_id, description, hsn_sac, quantity, unit, unit_price, discount_percent, tax_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, total, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [inv2Res.insertId, 'Full-Stack Web App UI/UX Development', '998314', 40, 'Hours', 1200.00, 5, 18, 45600.00, 4104.00, 4104.00, 0, 53808.00, 1]);

    // Invoice 3: Overdue (Inter-state IGST: Karnataka to Kerala)
    const inv3Res = await insert(`
      INSERT INTO invoices (
        invoice_number, business_id, client_id, invoice_date, due_date, 
        po_number, place_of_supply, status, payment_method, payment_date,
        subtotal, discount_type, discount_value, discount_amount, tax_type,
        cgst_amount, sgst_amount, igst_amount, total_tax, shipping_charges, round_off, total_amount, notes, terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'INV-2026-0003', 1, 2, formatDate(d3), formatDate(due3),
      'PO-GFS-401', 'Kerala', 'overdue', '', null,
      35000.00, 'fixed', 0, 0, 'inter',
      0.00, 0.00, 6300.00, 6300.00, 0, 0, 41300.00,
      'Payment overdue. Kindly process at the earliest.', 'Immediate settlement requested.'
    ]);

    await insert(`
      INSERT INTO invoice_items (invoice_id, description, hsn_sac, quantity, unit, unit_price, discount_percent, tax_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, total, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [inv3Res.insertId, 'API Integration & Payment Gateway Setup', '998313', 1, 'Milestone', 35000.00, 0, 18, 35000.00, 0, 0, 6300.00, 41300.00, 1]);
  }
}

// Initialize SQLite database
async function initSqlite() {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, '..', 'dinvoice.db');
    sqliteDb = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Failed to open SQLite database:', err);
        return reject(err);
      }
      console.log('Using SQLite database at:', dbPath);
      currentEngine = 'sqlite';
      connectionStatus = {
        engine: 'sqlite',
        connected: true,
        message: 'Active (Embedded SQLite Engine - Zero Config)',
        database: 'dinvoice.db',
        host: 'Local System',
        user: 'local',
        port: 'N/A'
      };

      // Create SQLite tables
      sqliteDb.serialize(async () => {
        sqliteDb.run(`
          CREATE TABLE IF NOT EXISTS businesses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            logo_url TEXT,
            email TEXT,
            phone TEXT,
            address_line1 TEXT,
            address_line2 TEXT,
            city TEXT,
            state TEXT,
            pincode TEXT,
            country TEXT DEFAULT 'India',
            gstin TEXT,
            pan TEXT,
            bank_name TEXT,
            account_name TEXT,
            account_number TEXT,
            ifsc_code TEXT,
            upi_id TEXT,
            default_notes TEXT,
            default_terms TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        sqliteDb.run(`
          CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            company_name TEXT,
            email TEXT,
            phone TEXT,
            address_line1 TEXT,
            address_line2 TEXT,
            city TEXT,
            state TEXT,
            pincode TEXT,
            country TEXT DEFAULT 'India',
            gstin TEXT,
            shipping_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        sqliteDb.run(`
          CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT NOT NULL UNIQUE,
            business_id INTEGER DEFAULT 1,
            client_id INTEGER,
            invoice_date TEXT NOT NULL,
            due_date TEXT NOT NULL,
            po_number TEXT,
            place_of_supply TEXT,
            status TEXT DEFAULT 'pending',
            payment_method TEXT,
            payment_date TEXT,
            subtotal REAL DEFAULT 0.0,
            discount_type TEXT DEFAULT 'fixed',
            discount_value REAL DEFAULT 0.0,
            discount_amount REAL DEFAULT 0.0,
            tax_type TEXT DEFAULT 'intra',
            cgst_amount REAL DEFAULT 0.0,
            sgst_amount REAL DEFAULT 0.0,
            igst_amount REAL DEFAULT 0.0,
            total_tax REAL DEFAULT 0.0,
            shipping_charges REAL DEFAULT 0.0,
            round_off REAL DEFAULT 0.0,
            total_amount REAL DEFAULT 0.0,
            notes TEXT,
            terms TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id)
          )
        `);

        sqliteDb.run(`
          CREATE TABLE IF NOT EXISTS invoice_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER NOT NULL,
            description TEXT NOT NULL,
            hsn_sac TEXT,
            quantity REAL NOT NULL DEFAULT 1.0,
            unit TEXT DEFAULT 'Nos',
            unit_price REAL NOT NULL DEFAULT 0.0,
            discount_percent REAL DEFAULT 0.0,
            tax_rate REAL DEFAULT 18.0,
            taxable_amount REAL NOT NULL DEFAULT 0.0,
            cgst_amount REAL DEFAULT 0.0,
            sgst_amount REAL DEFAULT 0.0,
            igst_amount REAL DEFAULT 0.0,
            total REAL NOT NULL DEFAULT 0.0,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
          )
        `);

        sqliteDb.run(`
          CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key_name TEXT NOT NULL UNIQUE,
            key_value TEXT
          )
        `, async (err) => {
          if (!err) {
            try {
              await seedDefaultData();
              resolve();
            } catch (seedErr) {
              console.error('Seed error:', seedErr);
              resolve();
            }
          } else {
            reject(err);
          }
        });
      });
    });
  });
}

// Try connecting to MySQL
async function tryConnectMySQL(config) {
  const host = config.host || process.env.DB_HOST || 'localhost';
  const user = config.user || process.env.DB_USER || 'root';
  const password = config.password !== undefined ? config.password : (process.env.DB_PASSWORD || '');
  const database = config.database || process.env.DB_NAME || 'dinvoice_db';
  const port = parseInt(config.port || process.env.DB_PORT || 3306, 10);

  // First connect without database to ensure database exists
  let rootConn;
  try {
    rootConn = await mysql.createConnection({
      host,
      user,
      password,
      port,
      connectTimeout: 2000
    });
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await rootConn.end();
  } catch (err) {
    if (rootConn) await rootConn.end().catch(() => {});
    throw err;
  }

  // Create connection pool with target database
  const pool = mysql.createPool({
    host,
    user,
    password,
    database,
    port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 2000
  });

  // Verify connection
  const conn = await pool.getConnection();
  conn.release();

  // Create MySQL tables if not exist
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (tblErr) {
      console.warn('MySQL table warning:', tblErr.message);
    }
  }

  return pool;
}

// Initialize database system (attempts MySQL, falls back to SQLite)
async function initDatabase() {
  const mysqlConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dinvoice_db',
    port: process.env.DB_PORT || 3306
  };

  try {
    console.log(`Attempting MySQL connection to ${mysqlConfig.user}@${mysqlConfig.host}:${mysqlConfig.port}...`);
    mysqlPool = await tryConnectMySQL(mysqlConfig);
    currentEngine = 'mysql';
    connectionStatus = {
      engine: 'mysql',
      connected: true,
      message: 'Active (Connected to MySQL Server)',
      host: mysqlConfig.host,
      user: mysqlConfig.user,
      database: mysqlConfig.database,
      port: mysqlConfig.port
    };
    console.log('✅ Connected to MySQL successfully!');
    await seedDefaultData();
  } catch (err) {
    console.warn('⚠️ MySQL connection not available or credentials required:', err.message);
    console.log('👉 Falling back gracefully to embedded SQLite database so app is immediately ready.');
    await initSqlite();
  }
}

// Switch to MySQL dynamically with user-provided credentials
async function switchMySQL(config) {
  try {
    const newPool = await tryConnectMySQL(config);
    if (mysqlPool) {
      await mysqlPool.end().catch(() => {});
    }
    mysqlPool = newPool;
    currentEngine = 'mysql';
    connectionStatus = {
      engine: 'mysql',
      connected: true,
      message: 'Active (Connected to MySQL Server)',
      host: config.host || 'localhost',
      user: config.user || 'root',
      database: config.database || 'dinvoice_db',
      port: config.port || 3306
    };
    await seedDefaultData();
    return { success: true, message: 'Connected to MySQL successfully!' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Execute SELECT query returning array of rows
async function query(sql, params = []) {
  if (currentEngine === 'mysql' && mysqlPool) {
    const [rows] = await mysqlPool.query(sql, params);
    return rows;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }
}

// Execute SELECT query returning single row
async function getOne(sql, params = []) {
  if (currentEngine === 'mysql' && mysqlPool) {
    const [rows] = await mysqlPool.query(sql, params);
    return rows && rows.length > 0 ? rows[0] : null;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  }
}

// Execute INSERT query returning { insertId }
async function insert(sql, params = []) {
  if (currentEngine === 'mysql' && mysqlPool) {
    const [result] = await mysqlPool.query(sql, params);
    return { insertId: result.insertId, affectedRows: result.affectedRows };
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ insertId: this.lastID, affectedRows: this.changes });
      });
    });
  }
}

// Execute UPDATE or DELETE query returning { affectedRows }
async function execute(sql, params = []) {
  if (currentEngine === 'mysql' && mysqlPool) {
    const [result] = await mysqlPool.query(sql, params);
    return { affectedRows: result.affectedRows };
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ affectedRows: this.changes });
      });
    });
  }
}

module.exports = {
  initDatabase,
  query,
  getOne,
  insert,
  execute,
  switchMySQL,
  getStatus: () => ({ ...connectionStatus, currentEngine })
};
