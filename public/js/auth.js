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

    // Google Sign-In buttons
    const googleLoginBtn = document.getElementById('btnGoogleSignIn');
    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', () => this.handleGoogleSignIn());
    }
    const googleRegBtn = document.getElementById('btnGoogleSignInReg');
    if (googleRegBtn) {
      googleRegBtn.addEventListener('click', () => this.handleGoogleSignIn());
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

  // Google Sign-In Handler
  async handleGoogleSignIn() {
    this.hideAlert();
    const btnGoogleLogin = document.getElementById('btnGoogleSignIn');
    const btnGoogleReg = document.getElementById('btnGoogleSignInReg');

    const setButtonsLoading = (loading) => {
      [btnGoogleLogin, btnGoogleReg].forEach(btn => {
        if (btn) {
          btn.disabled = loading;
          if (loading) {
            btn.innerHTML = `<span class="spinner-sm" style="border-top-color: #2563eb;"></span> Signing in with Google...`;
          } else {
            btn.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            `;
          }
        }
      });
    };

    setButtonsLoading(true);

    try {
      if (firebaseAuth && isRealFirebase) {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        await firebaseAuth.signInWithPopup(provider);
      } else {
        // Fallback Google Sign-In Sandbox
        await new Promise(r => setTimeout(r, 600));
        const email = 'google.user@dinvoice.com';
        const uid = 'google_user_demo99';
        this.currentUser = {
          uid,
          email,
          displayName: 'Google Demo User'
        };
        localStorage.setItem('dinvoice_auth_user', JSON.stringify(this.currentUser));
        await this.onUserSignedIn();
      }
    } catch (err) {
      console.error('Google Sign-in error:', err);
      let msg = err.message;
      if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Google sign-in popup was closed before completing.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        msg = 'Sign-in cancelled.';
      }
      this.showAlert(msg, 'error');
    } finally {
      setButtonsLoading(false);
    }
  },

  // Handle Logout (Clears session only, NEVER deletes old invoices or database)
  async logout() {
    try {
      if (firebaseAuth && isRealFirebase) {
        await firebaseAuth.signOut();
      }
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    this.onUserSignedOut();
    showToast('You have been signed out successfully. Your saved invoices remain secure.', 'info');
  }
};
