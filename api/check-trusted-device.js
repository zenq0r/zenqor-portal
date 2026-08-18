const { getAdminApp } = require('./_firebaseAdmin');
const { clearTrustedCookie, hashToken, parseCookie } = require('./_trustedDevice');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    try {
        const authHeader = req.headers.authorization || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!idToken) { res.status(401).json({ trusted: false }); return; }
        const token = parseCookie(req.headers.cookie);
        if (!token) { res.status(200).json({ trusted: false }); return; }

        const admin = getAdminApp();
        const decoded = await admin.auth().verifyIdToken(idToken);
        const db = admin.firestore();
        const deviceRef = db.collection('trusted_login_devices').doc(hashToken(token));
        const [deviceDoc, userDoc] = await Promise.all([deviceRef.get(), db.collection('users').doc(decoded.uid).get()]);
        const device = deviceDoc.exists ? deviceDoc.data() : null;
        const currentRole = userDoc.exists ? userDoc.data().role : (decoded.email === 'admin@zenq0r.com' ? 'Superadmin' : null);
        const trusted = Boolean(device && device.uid === decoded.uid && device.role === currentRole && device.expiresAt?.toMillis?.() > Date.now());
        if (!trusted) res.setHeader('Set-Cookie', clearTrustedCookie());
        res.status(200).json({ trusted });
    } catch (error) {
        console.error('check-trusted-device error:', error);
        res.setHeader('Set-Cookie', clearTrustedCookie());
        res.status(200).json({ trusted: false });
    }
};
