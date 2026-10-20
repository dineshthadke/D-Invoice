// ============================================================
// D-INVOICE SETTINGS & DATABASE MANAGER
// ============================================================

const Settings = {
  async init() {
    await this.loadDbStatus();
  },

  async loadDbStatus() {
    try {
      const res = await API.getDbStatus();
      if (!res.success) return;

      const d = res.data;
      const isMysql = d.engine === 'mysql';

      // Update Header Badge
      const badge = document.getElementById('dbBadgeText');
      if (badge) {
        badge.textContent = isMysql ? 'DB: MySQL (Active)' : 'DB: SQLite (Zero-Config)';
      }

      // Update Settings Page
      const title = document.getElementById('settingsDbEngineTitle');
      const desc = document.getElementById('settingsDbEngineDesc');
      const host = document.getElementById('settingsDbHost');
      const name = document.getElementById('settingsDbName');
      const user = document.getElementById('settingsDbUser');
      const statusBadge = document.getElementById('settingsDbBadge');

      if (title) {
        title.textContent = isMysql
          ? 'Engine: MySQL Server 8.0 (Permanent DB Storage)'
          : 'Engine: SQLite (Zero-Config Embedded Storage)';
      }

      if (desc) {
        desc.textContent = isMysql
          ? 'Your invoices, clients, and business data are permanently stored in the MySQL database.'
          : 'Your invoices and clients are stored in local persistent SQLite. Enter your MySQL password below to switch to MySQL anytime.';
      }

      if (host) host.textContent = d.host || 'localhost';
      if (name) name.textContent = d.database || 'dinvoice_db';
      if (user) user.textContent = d.user || 'root';

      if (statusBadge) {
        statusBadge.textContent = d.connected ? 'Operational' : 'Disconnected';
        statusBadge.className = d.connected ? 'badge badge-success' : 'badge badge-danger';
      }

      // Sync form values
      if (document.getElementById('mysqlHost') && d.host) {
        document.getElementById('mysqlHost').value = d.host === 'Local System' ? 'localhost' : d.host;
      }
      if (document.getElementById('mysqlUser') && d.user) {
        document.getElementById('mysqlUser').value = d.user === 'local' ? 'root' : d.user;
      }
      if (document.getElementById('mysqlDatabase') && d.database) {
        document.getElementById('mysqlDatabase').value = d.database === 'dinvoice.db' ? 'dinvoice_db' : d.database;
      }

    } catch (err) {
      console.warn('Could not load DB status:', err);
    }
  },

  async connectMySQL() {
    const host = document.getElementById('mysqlHost').value.trim();
    const port = document.getElementById('mysqlPort').value.trim();
    const user = document.getElementById('mysqlUser').value.trim();
    const password = document.getElementById('mysqlPassword').value;
    const database = document.getElementById('mysqlDatabase').value.trim();

    const feedback = document.getElementById('mysqlConnectFeedback');
    const btn = document.getElementById('btnConnectMySQL');

    feedback.style.display = 'block';
    feedback.className = 'connect-feedback';
    feedback.textContent = 'Connecting to MySQL Server...';
    btn.disabled = true;

    try {
      const res = await API.testAndConnectMySQL({ host, port, user, password, database });
      if (res.success) {
        feedback.className = 'connect-feedback success';
        feedback.textContent = '✅ Connected to MySQL successfully! Database and tables verified.';
        showToast('Connected to MySQL successfully!', 'success');
        await this.loadDbStatus();
        Dashboard.refresh();
      } else {
        throw new Error(res.error || 'Failed to connect to MySQL');
      }
    } catch (err) {
      console.error('MySQL connection error:', err);
      feedback.className = 'connect-feedback error';
      feedback.textContent = '❌ MySQL Connection Error: ' + err.message;
      showToast('MySQL Error: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }
};
