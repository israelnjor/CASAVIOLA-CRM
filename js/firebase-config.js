// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAdxouOUTmH3a0ryezUFOp0KYX9S_EdJg",
  authDomain: "casaviola-crm.firebaseapp.com",
  projectId: "casaviola-crm",
  storageBucket: "casaviola-crm.firebasestorage.app",
  messagingSenderId: "1066160343819",
  appId: "1:1066160343819:web:9dea8ff989e7bffbf9f00e"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ── SESSION PERSISTENCE ──
// browserSessionPersistence = session is tied to the browser tab.
// Closing the tab or browser logs the user out automatically.
// This replaces the default browserLocalPersistence which survives restarts.
await setPersistence(auth, browserSessionPersistence);

export { auth };
export const db      = getFirestore(app);
export const storage = getStorage(app);