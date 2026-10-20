// ============================================================
// D-INVOICE MAIN APPLICATION ENTRY & ROUTER
// ============================================================

const App = {
  currentTab: 'dashboard',
  deleteCallback: null,

  init() {
    this.setupNavigation();
    this.setupMobileMenu();
    this.setupKeyboardShortcuts();

    // Initial check of DB status
    Settings.loadDbStatus();

    // Load initial view
    this.navigateTo('dashboard');
  },

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab');
        if (tab) this.navigateTo(tab);
      });
    });
  },

  setupMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const nav = document.getElementById('mainNav');
    if (!btn || !nav) return;

    btn.addEventListener('click', () => {
      nav.classList.toggle('open');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !btn.contains(e.target)) {
        nav.classList.remove('open');
      }
    });
  },

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // ESC closes open modals
      if (e.key === 'Escape') {
        InvoicePreview.close();
        Clients.closeModal();
        InvoiceList.closeMarkPaidModal();
        this.closeDeleteModal();
      }
    });
  },

  navigateTo(tabName) {
    this.currentTab = tabName;

    // Close mobile nav
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.remove('open');

    // Update active nav button
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Update active view section
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) {
      targetView.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Trigger tab-specific initialization
    switch (tabName) {
      case 'dashboard':
        Dashboard.init();
        break;
      case 'invoices':
        InvoiceList.init();
        break;
      case 'clients':
        Clients.init();
        break;
      case 'business':
        Business.init();
        break;
      case 'settings':
        Settings.init();
        break;
    }
  },

  openCreateInvoice() {
    this.navigateTo('create-invoice');
    InvoiceForm.init();
  },

  openEditInvoice(invoiceId) {
    this.navigateTo('create-invoice');
    InvoiceForm.init(invoiceId);
  },

  // Delete Confirmation Modal
  openDeleteModal(message, onConfirm) {
    this.deleteCallback = onConfirm;
    document.getElementById('deleteConfirmMessage').textContent = message;
    const confirmBtn = document.getElementById('deleteConfirmBtn');
    confirmBtn.onclick = () => {
      if (this.deleteCallback) this.deleteCallback();
      this.closeDeleteModal();
    };
    document.getElementById('deleteConfirmModal').style.display = 'flex';
  },

  closeDeleteModal() {
    document.getElementById('deleteConfirmModal').style.display = 'none';
    this.deleteCallback = null;
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
