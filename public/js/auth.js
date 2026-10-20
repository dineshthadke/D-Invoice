// ============================================================
// D-INVOICE FIREBASE AUTHENTICATION CONTROLLER
// ============================================================

const Auth = {
  currentUser: null,
  authMode: 'login', // 'login' or 'register'

  init() {
    this.setupListeners();
    this.checkAuthState();
  },

  setupListeners() {
    // Mode toggles
    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    if (tabLogin) tabLogin.addEventListener('click', () => this.switchMode('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => this.switchMode('register'));

    // Forms
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRegister();
      });
    }

    // Demo Login buttons
    const demoBtn = document.getElementById('btnDemoLogin');
    if (demoBtn) {
      demoBtn.addEventListener('click', () => this.handleDemoLogin());
    }

    // Logout button in header
    const logoutBtn = document.getElementById('headerLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  },

  switchMode(mode) {
    this.authMode = mode;
    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    const loginCard = document.getElementById('loginCard');
    const registerCard = document.getElementById('registerCard');
    const authAlert = document.getElementById('authAlert');

    if (authAlert) authAlert.style.display = 'none';

    if (mode === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      loginCard.style.display = 'block';
      registerCard.style.display = 'none';
    } else {
      tabLogin.classList.remove('active');
      tabRegister.classList.add('active');
      loginCard.style.display = 'none';
      registerCard.style.display = 'block';
    }
  },

  checkAuthState() {
    // Listen to Firebase Auth state
    if (firebaseAuth) {
      firebaseAuth.onAuthStateChanged(async (user) => {
        if (user) {
          this.currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0]
          };
          await this.onUserSignedIn();
        } else {
          this.onUserSignedOut();
        }
      });
    } else {
      // Check stored session in fallback
      const savedUser = localStorage.getItem('dinvoice_auth_user');
      if (savedUser) {
        try {
          this.currentUser = JSON.parse(savedUser);
          this.onUserSignedIn();
        } catch (e) {
          this.onUserSignedOut();
        }
      } else {
        this.onUserSignedOut();
      }
    }
  },

  async onUserSignedIn() {
    console.log('✅ User signed in:', this.currentUser.email, 'UID:', this.currentUser.uid);

    // Update Header with User Avatar & Email
    const userPill = document.getElementById('headerUserPill');
    const userEmailLabel = document.getElementById('headerUserEmail');
    const userAvatar = document.getElementById('headerUserAvatar');
    const logoutBtn = document.getElementById('headerLogoutBtn');
    const mainNav = document.getElementById('mainNav');
    const headerCreateBtn = document.getElementById('headerCreateBtn');

    if (userPill) userPill.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (mainNav) mainNav.style.display = 'flex';
    if (headerCreateBtn) headerCreateBtn.style.display = 'inline-flex';

    if (userEmailLabel) userEmailLabel.textContent = this.currentUser.email;
    if (userAvatar) {
      const initial = (this.currentUser.email || 'U')[0].toUpperCase();
      userAvatar.textContent = initial;
    }

    // Hide Auth Page, show App Content
    const authView = document.getElementById('view-auth');
    if (authView) authView.style.display = 'none';

    // Seed sample data if first time
    await FirestoreService.seedUserInitialData(this.currentUser.uid, this.currentUser.email, this.currentUser.displayName);

    // Navigate to Dashboard
    App.navigateTo('dashboard');
    showToast(`Welcome back, ${this.currentUser.displayName || this.currentUser.email}!`, 'success');
  },

  onUserSignedOut() {
    this.currentUser = null;
    localStorage.removeItem('dinvoice_auth_user');

    // Update Header
    const userPill = document.getElementById('headerUserPill');
    const logoutBtn = document.getElementById('headerLogoutBtn');
    const mainNav = document.getElementById('mainNav');
    const headerCreateBtn = document.getElementById('headerCreateBtn');

    if (userPill) userPill.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (mainNav) mainNav.style.display = 'none';
    if (headerCreateBtn) headerCreateBtn.style.display = 'none';

    // Hide all views, display Auth Page
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    const authView = document.getElementById('view-auth');
    if (authView) authView.style.display = 'block';
  },

  showAlert(message, type = 'error') {
    const alertBox = document.getElementById('authAlert');
    if (!alertBox) return;
    alertBox.className = `auth-alert auth-alert-${type}`;
    alertBox.textContent = message;
    alertBox.style.display = 'block';
  },

  hideAlert() {
    const alertBox = document.getElementById('authAlert');
    if (alertBox) alertBox.style.display = 'none';
  },

  // Handle Sign In
  async handleLogin() {
    this.hideAlert();
    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPassword');
    const btnSubmit = document.getElementById('btnLoginSubmit');

    const email = emailInput.value.trim();
    const password = passInput.value;

    if (!email || !password) {
      this.showAlert('Please enter both email and password.');
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="spinner-sm"></span> Signing In...`;

    try {
      if (firebaseAuth && isRealFirebase) {
        await firebaseAuth.signInWithEmailAndPassword(email, password);
      } else {
        // Fallback Auth
        await new Promise(r => setTimeout(r, 600));
        const uid = 'user_' + btoa(email).replace(/=/g, '').toLowerCase().substring(0, 16);
        this.currentUser = {
          uid,
          email,
          displayName: email.split('@')[0]
        };
        localStorage.setItem('dinvoice_auth_user', JSON.stringify(this.currentUser));
        await this.onUserSignedIn();
      }
    } catch (err) {
      console.error('Login error:', err);
      let msg = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please verify your credentials.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please try again later.';
      }
      this.showAlert(msg, 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>Sign In to D-Invoice</span>`;
    }
  },

  // Handle Registration
  async handleRegister() {
    this.hideAlert();
    const nameInput = document.getElementById('regName');
    const emailInput = document.getElementById('regEmail');
    const passInput = document.getElementById('regPassword');
    const confirmInput = document.getElementById('regConfirmPassword');
    const btnSubmit = document.getElementById('btnRegisterSubmit');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passInput.value;
    const confirm = confirmInput.value;

    if (!name) {
      this.showAlert('Please enter your full name or business name.');
      return;
    }
    if (!email) {
      this.showAlert('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      this.showAlert('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      this.showAlert('Passwords do not match.');
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="spinner-sm"></span> Creating Account...`;

    try {
      if (firebaseAuth && isRealFirebase) {
        const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
        if (cred.user) {
          await cred.user.updateProfile({ displayName: name });
        }
      } else {
        // Fallback Auth
        await new Promise(r => setTimeout(r, 600));
        const uid = 'user_' + btoa(email).replace(/=/g, '').toLowerCase().substring(0, 16);
        this.currentUser = {
          uid,
          email,
          displayName: name
        };
        localStorage.setItem('dinvoice_auth_user', JSON.stringify(this.currentUser));
        await this.onUserSignedIn();
      }
    } catch (err) {
      console.error('Registration error:', err);
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please choose a stronger password.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      }
      this.showAlert(msg, 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>Create Free Account</span>`;
    }
  },

  // 1-Click Quick Demo Sign In
  async handleDemoLogin() {
    document.getElementById('loginEmail').value = 'demo@dinvoice.com';
    document.getElementById('loginPassword').value = 'demo1234';
    await this.handleLogin();
  },

  // Handle Logout
  async logout() {
    try {
      if (firebaseAuth && isRealFirebase) {
        await firebaseAuth.signOut();
      }
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    this.onUserSignedOut();
    showToast('You have been signed out successfully.', 'info');
  }
};
