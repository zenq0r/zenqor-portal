// ============================================================
// ZENQOR TECHNOLOGIES - firebase-config.js (APP CHECK SECURE v2.4)
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

const env = window.__ENV__ || {};

const firebaseConfig = {
    apiKey: env.FIREBASE_API_KEY || "AIzaSyCJyjvlm8jG-mT_1mDYsyF562L6XuskFxU",
    authDomain: env.FIREBASE_AUTH_DOMAIN || "zenqor-web.firebaseapp.com",
    projectId: env.FIREBASE_PROJECT_ID || "zenqor-web",
    storageBucket: env.FIREBASE_STORAGE_BUCKET || "zenqor-web.firebasestorage.app",
    messagingSenderId: env.FIREBASE_MESSAGING_ID || "785478368719",
    appId: env.FIREBASE_APP_ID || "1:785478368719:web:c20d5c3ecc891c692566ba",
    measurementId: env.FIREBASE_MEASUREMENT_ID || "G-NLFPW2ECR9"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Inisialisasi Firebase App Check dengan reCAPTCHA v3
try {
    const recaptchaKey = env.RECAPTCHA_SITE_KEY || '6LfVnngtAAAAAGJdJnR99Vsm2pnJq2kLwKxvBGUV';
    
    // Dayakan Debug Token untuk ujian lokal (localhost / 127.0.0.1)
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaKey),
        isTokenAutoRefreshEnabled: true
    });
} catch (err) {
    console.warn("App Check Initialization Warning:", err);
}

const db = initializeFirestore(app, {
    localCache: persistentLocalCache()
});

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