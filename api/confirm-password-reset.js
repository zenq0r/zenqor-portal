const { getAdminApp } = require('./_firebaseAdmin');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { token, newPassword } = req.body || {};
        if (!token || typeof token !== 'string') {
            res.status(400).json({ error: 'This reset link is invalid. Please request a new one.' });
            return;
        }
        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
            res.status(400).json({ error: 'Password must be at least 8 characters long.' });
            return;
        }

        const admin = getAdminApp();
        const db = admin.firestore();
        const docRef = db.collection('password_reset_tokens').doc(token);
        const doc = await docRef.get();

        if (!doc.exists) {
            res.status(400).json({ error: 'This reset link is invalid. Please request a new one.' });
            return;
        }

        const data = doc.data();
        if (data.used) {
            res.status(400).json({ error: 'This reset link has already been used. Please request a new one.' });
            return;
        }
        if (new Date(data.expiresAt).getTime() < Date.now()) {
            res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
            return;
        }

        await admin.auth().updateUser(data.uid, { password: newPassword });
        await docRef.update({ used: true, usedAt: new Date().toISOString() });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('confirm-password-reset error:', error);
        res.status(500).json({ error: 'Unable to reset your password right now. Please try again shortly.' });
    }
};
