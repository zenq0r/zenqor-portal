const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

function getAdminApp() {
    let app = getApps()[0];
    if (!app) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
        let serviceAccount;
        try {
            serviceAccount = JSON.parse(raw);
        } catch (_) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY must contain valid JSON.');
        }
        app = initializeApp({ credential: cert(serviceAccount) });
    }
    return {
        auth: () => getAuth(app),
        firestore: () => getFirestore(app)
    };
}

module.exports = { getAdminApp };
