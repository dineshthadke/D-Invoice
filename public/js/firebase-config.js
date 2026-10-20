// ============================================================
// D-INVOICE FIREBASE CONFIGURATION & INITIALIZATION
// ============================================================

// Default Firebase Configuration (Sample / Placeholder)
const defaultFirebaseConfig = {
  apiKey: "AIzaSyDemoProjectKey-For-DInvoice-Web",
  authDomain: "d-invoice-app.firebaseapp.com",
  projectId: "d-invoice-app",
  storageBucket: "d-invoice-app.appspot.com",
  messagingSenderId: "1029384756",
  appId: "1:1029384756:web:a1b2c3d4e5f6g7h8i9j0k1"
};

// Validates whether an API key is a genuine live Google Firebase Web API Key
function isPlaceholderApiKey(key) {
  if (!key || typeof key !== 'string') return true;
  const trimmed = key.trim();
  // Valid Firebase API keys start with "AIzaSy" and are exactly 39 characters long
  if (
    trimmed.includes('DemoProjectKey') ||
    trimmed.startsWith('AIzaSyDemo') ||
    trimmed === 'YOUR_API_KEY' ||
    trimmed.length < 35 ||
    !trimmed.startsWith('AIzaSy')
  ) {
    return true;
  }
  return false;
}

// Retrieve stored config or use default
function getActiveFirebaseConfig() {
  try {
    const saved = localStorage.getItem('dinvoice_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && !isPlaceholderApiKey(parsed.apiKey)) {
        return parsed;
      }
    }
  } catch (e) {}
  return defaultFirebaseConfig;
}

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let isRealFirebase = false;

// Initialize Firebase with auto-detection of real vs demo credentials
function initFirebaseApp() {
  const config = getActiveFirebaseConfig();

  // If the user has NOT provided a genuine live Firebase API key, operate in Sandbox Mode
  // This completely eliminates "auth/api-key-not-valid" errors
  if (isPlaceholderApiKey(config.apiKey)) {
    console.log('ℹ️ Firebase running in High-Fidelity Sandbox Mode (No live API key set yet).');
    isRealFirebase = false;
    firebaseApp = null;
    firebaseAuth = null;
    firebaseDb = null;
    return;
  }

  if (typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(config);
      } else {
        firebaseApp = firebase.app();
      }
      firebaseAuth = firebase.auth();
      firebaseDb = firebase.firestore();
      isRealFirebase = true;
      console.log('🔥 Connected to Live Firebase Project:', config.projectId);
    } catch (err) {
      console.warn('⚠️ Real Firebase initialization error:', err.message);
      isRealFirebase = false;
      firebaseAuth = null;
      firebaseDb = null;
    }
  }
}

// Function to save user's live Firebase configuration
function saveUserFirebaseConfig(newConfig) {
  if (!newConfig || !newConfig.apiKey || isPlaceholderApiKey(newConfig.apiKey)) {
    throw new Error('Please enter a valid Google Firebase Web API Key (must start with "AIzaSy..." and be ~39 characters long).');
  }
  localStorage.setItem('dinvoice_firebase_config', JSON.stringify(newConfig));
  window.location.reload();
}

// Function to clear custom config and return to sandbox
function resetToFirebaseSandbox() {
  localStorage.removeItem('dinvoice_firebase_config');
  isRealFirebase = false;
  firebaseAuth = null;
  firebaseDb = null;
  if (typeof showToast === 'function') {
    showToast('Switched to Firebase Sandbox Mode', 'info');
  }
}

// Initialize on script load
initFirebaseApp();

