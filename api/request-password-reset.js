const crypto = require('crypto');
const { getAdminApp } = require('./_firebaseAdmin');
const { sendResetEmail } = require('./_resetEmail');

const TOKEN_TTL_MS = 30 * 60 * 1000;
const THROTTLE_MS = 2 * 60 * 1000;

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { email } = req.body || {};
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            res.status(400).json({ error: 'A valid email address is required.' });
            return;
        }
        const normalizedEmail = email.trim();

        const admin = getAdminApp();
        const db = admin.firestore();

        let userRecord = null;
        try {
            userRecord = await admin.auth().getUserByEmail(normalizedEmail);
        } catch (lookupError) {
            // Account not found — fall through without revealing this to the caller.
        }

        if (userRecord) {
            const recentSnap = await db.collection('password_reset_tokens')
                .where('uid', '==', userRecord.uid)
                .where('used', '==', false)
                .get();

            let shouldSend = true;
            if (!recentSnap.empty) {
                const mostRecent = Math.max(...recentSnap.docs.map(d => new Date(d.data().createdAt).getTime()));
                if (Date.now() - mostRecent < THROTTLE_MS) shouldSend = false;
            }

            if (shouldSend) {
                const token = crypto.randomBytes(32).toString('hex');
                const now = new Date();
                const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);
                await db.collection('password_reset_tokens').doc(token).set({
                    uid: userRecord.uid,
                    email: normalizedEmail.toLowerCase(),
                    createdAt: now.toISOString(),
                    expiresAt: expiresAt.toISOString(),
                    used: false
                });

                const resetLink = `https://www.portal.zenq0r.com/?resetToken=${token}`;
                await sendResetEmail(normalizedEmail, resetLink);
            }
        }

        // Always respond success — never reveal whether the account exists.
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('request-password-reset error:', error);
        res.status(500).json({ error: 'Unable to process this request right now. Please try again shortly.' });
    }
};
