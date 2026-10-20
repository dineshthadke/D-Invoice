const express = require('express');
const router = express.Router();
const db = require('../database');
const fs = require('fs');
const path = require('path');

// GET current database status
router.get('/db', (req, res) => {
  const status = db.getStatus();
  res.json({ success: true, data: status });
});

// TEST & SWITCH MySQL connection
router.post('/db/test', async (req, res) => {
  try {
    const { host, port, user, password, database } = req.body;
    const config = {
      host: host || 'localhost',
      port: port ? parseInt(port, 10) : 3306,
      user: user || 'root',
      password: password !== undefined ? password : '',
      database: database || 'dinvoice_db'
    };

    const result = await db.switchMySQL(config);

    if (result.success) {
      // Persist to .env file
      try {
        const envPath = path.join(__dirname, '..', '..', '.env');
        const envContent = `# D-Invoice Environment Configuration
PORT=3000
DB_HOST=${config.host}
DB_PORT=${config.port}
DB_USER=${config.user}
DB_PASSWORD=${config.password}
DB_NAME=${config.database}
`;
        fs.writeFileSync(envPath, envContent, 'utf8');
      } catch (envErr) {
        console.warn('Could not write .env file:', envErr.message);
      }

      return res.json({ success: true, message: result.message, data: db.getStatus() });
    } else {
      return res.status(400).json({ success: false, error: result.message });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
