// ✅ firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyA98oH-4AaSIRysebl_tkIQLbPpJWGUOOo",
  authDomain: "getupdeals.firebaseapp.com",
  databaseURL: "https://getupdeals-default-rtdb.firebaseio.com",
  projectId: "getupdeals",
  storageBucket: "getupdeals.firebasestorage.app",
  messagingSenderId: "569105290959",
  appId: "1:569105290959:web:2597168bfdf3d84d0349ba"
};

// ✅ Initialize Firebase (v8 style)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ✅ Setup global access
window.auth = firebase.auth();
window.db = firebase.database();