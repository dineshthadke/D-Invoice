// ============================================================
// D-INVOICE FIREBASE CONFIGURATION & INITIALIZATION
// ============================================================

// Default Firebase Configuration
// Users can provide their own Firebase credentials in Settings or via localStorage
const defaultFirebaseConfig = {
  apiKey: "AIzaSyDemoProjectKey-For-DInvoice-Web",
  authDomain: "d-invoice-app.firebaseapp.com",
  projectId: "d-invoice-app",
  storageBucket: "d-invoice-app.appspot.com",
  messagingSenderId: "1029384756",
  appId: "1:1029384756:web:a1b2c3d4e5f6g7h8i9j0k1"
};

// Retrieve stored config or use default
function getActiveFirebaseConfig() {
  try {
    const saved = localStorage.getItem('dinvoice_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.projectId) return parsed;
    }
  } catch (e) {}
  return defaultFirebaseConfig;
}

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let isRealFirebase = false;

// Initialize Firebase
(function initFirebase() {
  const config = getActiveFirebaseConfig();
  
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
      console.log('🔥 Firebase initialized successfully with project:', config.projectId);
    } catch (err) {
      console.warn('⚠️ Real Firebase connection not ready (using local fallback sandbox):', err.message);
      isRealFirebase = false;
    }
  }
})();
