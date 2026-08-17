// Verifies the second-factor email OTP requested via request-login-otp.js.
// One-time use, 5-minute expiry, tied to the requesting user's own UID via
// their Firebase ID token — a code can't be used to verify a different account.
const { getAdminApp } = require('./_firebaseAdmin');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const authHeader = req.headers.authorization || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!idToken) { res.status(401).json({ valid: false, error: 'Missing authorization token.' }); return; }

        const admin = getAdminApp();
        const decoded = await admin.auth().verifyIdToken(idToken);

        const { code } = req.body || {};
        if (!code || typeof code !== 'string') { res.status(400).json({ valid: false, error: 'Enter the code from your email.' }); return; }

        const docRef = admin.firestore().collection('login_otp_codes').doc(decoded.uid);
        const doc = await docRef.get();
        if (!doc.exists) { res.status(400).json({ valid: false, error: 'No verification code was requested. Please sign in again.' }); return; }

        const data = doc.data();
        if (data.used) { res.status(400).json({ valid: false, error: 'This code has already been used. Please sign in again.' }); return; }
        if (new Date(data.expiresAt).getTime() < Date.now()) { res.status(400).json({ valid: false, error: 'This code has expired. Please sign in again.' }); return; }
        if (data.code !== code.trim()) { res.status(400).json({ valid: false, error: 'Incorrect code. Please try again.' }); return; }

        await docRef.update({ used: true, usedAt: new Date().toISOString() });
        res.status(200).json({ valid: true });
    } catch (error) {
        console.error('verify-login-otp error:', error);
        res.status(500).json({ valid: false, error: 'Unable to verify the code right now. Please try again.' });
    }
};
