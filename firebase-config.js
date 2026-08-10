// ============================================================
// ZENQOR TECHNOLOGIES - firebase-config.js (SAFE AUTH & DB v2.8)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    getDocs,
    writeBatch,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const env = window.__ENV__ || {};
const getEnvValue = (key, fallback) => {
    const value = env[key];
    return typeof value === 'string' && value.trim() && !value.includes('%%') ? value.trim() : fallback;
};

const firebaseConfig = {
    apiKey: getEnvValue('FIREBASE_API_KEY', "AIzaSyCJyjvlm8jG-mT_1mDYsyF562L6XuskFxU"),
    authDomain: getEnvValue('FIREBASE_AUTH_DOMAIN', "zenqor-web.firebaseapp.com"),
    projectId: getEnvValue('FIREBASE_PROJECT_ID', "zenqor-web"),
    storageBucket: getEnvValue('FIREBASE_STORAGE_BUCKET', "zenqor-web.firebasestorage.app"),
    messagingSenderId: getEnvValue('FIREBASE_MESSAGING_ID', "785478368719"),
    appId: getEnvValue('FIREBASE_APP_ID', "1:785478368719:web:c20d5c3ecc891c692566ba"),
    measurementId: getEnvValue('FIREBASE_MEASUREMENT_ID', "G-NLFPW2ECR9")
};

const app = initializeApp(firebaseConfig);
isAnalyticsSupported().then((supported) => {
    if (supported) getAnalytics(app);
}).catch(() => {});

const db = getFirestore(app);
const storage = getStorage(app);

const auth = getAuth(app);

export {
    db,
    auth,
    storage,
    ref,
    uploadBytes,
    getDownloadURL,
    collection,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    getDocs,
    writeBatch,
    query,
    where,
    orderBy,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
};
