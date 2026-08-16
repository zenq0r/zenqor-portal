// ============================================================
// ZENQOR TECHNOLOGIES - firebase-config.js (SAFE AUTH & DB v2.9 - FIRESTORE ATTACHMENTS)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    getDocs,
    writeBatch,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    sendPasswordResetEmail,
    verifyPasswordResetCode,
    confirmPasswordReset
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const env = window.__ENV__ || {};
const getEnvValue = (key, fallback) => {
    const value = env[key];
    return typeof value === 'string' && value.trim() && !value.includes('%%') ? value.trim() : fallback;
};

const firebaseConfig = {
    apiKey: getEnvValue('FIREBASE_API_KEY', "AIzaSyDgoE8ckbVWqc1j6bHq1u1685_xJp0y09Y"),
    authDomain: getEnvValue('FIREBASE_AUTH_DOMAIN', "zenqor-portal-a3b2d.firebaseapp.com"),
    projectId: getEnvValue('FIREBASE_PROJECT_ID', "zenqor-portal-a3b2d"),
    storageBucket: getEnvValue('FIREBASE_STORAGE_BUCKET', "zenqor-portal-a3b2d.firebasestorage.app"),
    messagingSenderId: getEnvValue('FIREBASE_MESSAGING_ID', "1065187936514"),
    appId: getEnvValue('FIREBASE_APP_ID', "1:1065187936514:web:d05089d6668c58bf3e9a1b"),
    measurementId: getEnvValue('FIREBASE_MEASUREMENT_ID', "")
};

const app = initializeApp(firebaseConfig);
isAnalyticsSupported().then((supported) => {
    if (supported) getAnalytics(app);
}).catch(() => {});

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export {
    db,
    auth,
    storage,
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    getDocs,
    writeBatch,
    query,
    where,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    sendPasswordResetEmail,
    verifyPasswordResetCode,
    confirmPasswordReset,
    storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject
};
