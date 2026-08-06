// ============================================================
// ZENQOR TECHNOLOGIES - firebase-config.js (SECURE v2.2)
// App Check AKTIF dengan reCAPTCHA v3 Site Key
// Domain: zenq0r.com
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
    initializeFirestore,
    persistentLocalCache,
    collection,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    initializeAppCheck,
    ReCaptchaV3Provider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

// ----------------------------------------------------------------
// KONFIGURASI FIREBASE (appId dikemaskini dari Firebase Console)
// ----------------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyCJyjvlm8jG-mT_1mDYsyF562L6XuskFxU",
    authDomain: "zenqor-web.firebaseapp.com",
    projectId: "zenqor-web",
    storageBucket: "zenqor-web.firebasestorage.app",
    messagingSenderId: "785478368719",
    appId: "1:785478368719:web:c20d5c3ecc891c692566ba",
    measurementId: "G-NLFPW2ECR9"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ----------------------------------------------------------------
// [ISU #4 SELESAI] Firebase App Check dengan reCAPTCHA v3
// Site Key: 6LctvXctAAAAL4fS-SlNqbvCAFbGguGwwRY5HNk
// Domain berdaftar: zenq0r.com
//
// NOTA PENTING - Secret Key (6LctvXctAAAAHwux5H4-pOKka3SQD74ob61uss0)
// JANGAN letak Secret Key di sini (frontend) -- ini untuk server sahaja!
// Secret Key hanya digunakan jika anda ada backend/Cloud Functions.
// ----------------------------------------------------------------
initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6LctvXctAAAAL4fS-SlNqbvCAFbGguGwwRY5HNk'),
    isTokenAutoRefreshEnabled: true
});

// ----------------------------------------------------------------
// Firestore dengan Persistent Cache (offline support)
// ----------------------------------------------------------------
const db = initializeFirestore(app, {
    localCache: persistentLocalCache()
});

// ----------------------------------------------------------------
// Firebase Authentication
// ----------------------------------------------------------------
const auth = getAuth(app);

export {
    db,
    auth,
    collection,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
};
