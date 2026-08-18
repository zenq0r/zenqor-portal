// Verifies the second-factor email OTP required for every provisioned RBAC role.
// One-time use, 5-minute expiry, tied to the requesting user's own UID via
// their Firebase ID token — a code can't be used to verify a different account.
const { getAdminApp } = require('./_firebaseAdmin');
const crypto = require('crypto');
const { getClientIp, parseUserAgent } = require('./_auditMetadata');
const { hashToken, trustedCookie, trustedDurationMs } = require('./_trustedDevice');

const MAX_ATTEMPTS = 5;

function safeEqual(a, b) {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const authHeader = req.headers.authorization || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!idToken) { res.status(401).json({ valid: false, error: 'Missing authorization token.' }); return; }

        const admin = getAdminApp();
        const decoded = await admin.auth().verifyIdToken(idToken);

        const { code, trustDevice } = req.body || {};
        if (!code || typeof code !== 'string') { res.status(400).json({ valid: false, error: 'Enter the code from your email.' }); return; }

        const docRef = admin.firestore().collection('login_otp_codes').doc(decoded.uid);
        const result = await admin.firestore().runTransaction(async transaction => {
            const doc = await transaction.get(docRef);
            if (!doc.exists) return { error: 'No verification code was requested. Please sign in again.' };
            const data = doc.data();
            if (data.used) return { error: 'This code has already been used. Please sign in again.' };
            if (new Date(data.expiresAt).getTime() < Date.now()) return { error: 'This code has expired. Please sign in again.' };
            const attempts = Number(data.attempts || 0);
            if (attempts >= MAX_ATTEMPTS) return { error: 'Too many incorrect attempts. Please sign in again.' };
            if (!safeEqual(data.code, code.trim())) {
                transaction.update(docRef, { attempts: attempts + 1 });
                return { error: attempts + 1 >= MAX_ATTEMPTS ? 'Too many incorrect attempts. Please sign in again.' : 'Incorrect code. Please try again.' };
            }
            transaction.update(docRef, { used: true, usedAt: new Date().toISOString() });
            return { valid: true };
        });
        if (!result.valid) { res.status(400).json({ valid: false, error: result.error }); return; }

        let trustedUntil = null;
        if (trustDevice === true) {
            try {
                const db = admin.firestore();
                const userDoc = await db.collection('users').doc(decoded.uid).get();
                const role = userDoc.exists ? userDoc.data().role : (decoded.email === 'admin@zenq0r.com' ? 'Superadmin' : null);
                const durationMs = trustedDurationMs(role);
                const rawToken = crypto.randomBytes(32).toString('base64url');
                trustedUntil = new Date(Date.now() + durationMs);
                const metadata = parseUserAgent(req.headers['user-agent']);
                await db.collection('trusted_login_devices').doc(hashToken(rawToken)).set({
                    uid: decoded.uid,
                    role,
                    createdAt: admin.firestore.Timestamp.now(),
                    expiresAt: admin.firestore.Timestamp.fromDate(trustedUntil),
                    ip: getClientIp(req.headers),
                    browser: metadata.browser,
                    os: metadata.os,
                    device: metadata.device
                });
                res.setHeader('Set-Cookie', trustedCookie(rawToken, Math.floor(durationMs / 1000)));
            } catch (trustedError) {
                console.error('Unable to register trusted device:', trustedError);
            }
        }
        res.status(200).json({ valid: true, trustedUntil: trustedUntil?.toISOString() || null });
    } catch (error) {
        console.error('verify-login-otp error:', error);
        res.status(500).json({ valid: false, error: 'Unable to verify the code right now. Please try again.' });
    }
};
