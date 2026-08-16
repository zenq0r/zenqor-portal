const admin = require('firebase-admin');

function getAdminApp() {
    if (!admin.apps.length) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
        const serviceAccount = JSON.parse(raw);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    return admin;
}

module.exports = { getAdminApp };
