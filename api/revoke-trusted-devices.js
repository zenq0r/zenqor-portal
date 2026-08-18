const { getAdminApp } = require('./_firebaseAdmin');
const { clearTrustedCookie, revokeTrustedDevices } = require('./_trustedDevice');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    try {
        const authHeader = req.headers.authorization || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!idToken) { res.status(401).json({ error: 'Missing authorization token.' }); return; }
        const admin = getAdminApp();
        const decoded = await admin.auth().verifyIdToken(idToken);
        const revoked = await revokeTrustedDevices(admin.firestore(), decoded.uid);
        res.setHeader('Set-Cookie', clearTrustedCookie());
        res.status(200).json({ success: true, revoked });
    } catch (error) {
        console.error('revoke-trusted-devices error:', error);
        res.status(500).json({ error: 'Unable to forget trusted devices.' });
    }
};
