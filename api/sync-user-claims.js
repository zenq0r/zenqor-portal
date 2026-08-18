// Syncs a user's Firebase Auth custom claims (role, and clientDirectoryId for
// Client-role users) from their Firestore users/{uid} record. Storage Rules read
// these claims directly (request.auth.token.role / .clientDirectoryId) instead of
// calling firestore.get() cross-service, which does not work in this Firebase
// project (confirmed by direct testing — even firestore.exists() with a hardcoded
// path fails there). This is the standard, supported alternative for exactly this
// kind of role/ownership check in Storage Rules.
const { getAdminApp } = require('./_firebaseAdmin');
const { revokeTrustedDevices } = require('./_trustedDevice');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const authHeader = req.headers.authorization || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!idToken) { res.status(401).json({ error: 'Missing authorization token.' }); return; }

        const admin = getAdminApp();
        const decoded = await admin.auth().verifyIdToken(idToken);

        const { uid } = req.body || {};
        const targetUid = (typeof uid === 'string' && uid) ? uid : decoded.uid;

        // Self-sync always allowed (mirrors the caller's own Firestore record — no
        // privilege escalation risk since the role itself comes from Firestore, not
        // from anything the client supplies). Syncing someone ELSE's claims requires
        // being Superadmin/Director.
        if (targetUid !== decoded.uid) {
            const callerDoc = await admin.firestore().collection('users').doc(decoded.uid).get();
            const callerRole = callerDoc.exists ? callerDoc.data().role : null;
            if (!['Superadmin', 'Director'].includes(callerRole)) {
                res.status(403).json({ error: "Only Superadmin or Director may sync another user's access claims." });
                return;
            }
        }

        const targetDoc = await admin.firestore().collection('users').doc(targetUid).get();
        if (!targetDoc.exists) { res.status(404).json({ error: 'User record not found.' }); return; }
        const role = targetDoc.data().role || 'Staff';
        const email = targetDoc.data().email || '';

        const claims = { role };
        if (role === 'Client' && email) {
            // Primary contact match first, then fall back to additionalClientEmails —
            // lets a client company authorize more than one login (e.g. their finance
            // contact) against the same customers/{clientDirectoryId} record.
            let custSnap = await admin.firestore().collection('customers')
                .where('clientEmail', '==', email).limit(1).get();
            if (custSnap.empty) {
                custSnap = await admin.firestore().collection('customers')
                    .where('additionalClientEmails', 'array-contains', email).limit(1).get();
            }
            if (!custSnap.empty) claims.clientDirectoryId = custSnap.docs[0].id;
        }

        const targetAuthUser = await admin.auth().getUser(targetUid);
        const previousClaims = targetAuthUser.customClaims || {};
        // Initial claim provisioning is not a role change. This distinction matters
        // because a trusted token may have just been created after the user's first
        // successful OTP verification.
        const roleChanged = typeof previousClaims.role === 'string' && previousClaims.role !== claims.role;
        const clientScopeChanged = previousClaims.role === 'Client' && claims.role === 'Client' && previousClaims.clientDirectoryId !== claims.clientDirectoryId;
        const accessChanged = roleChanged || clientScopeChanged;
        await admin.auth().setCustomUserClaims(targetUid, claims);
        if (accessChanged) await revokeTrustedDevices(admin.firestore(), targetUid);
        res.status(200).json({ success: true, claims, trustedDevicesRevoked: accessChanged });
    } catch (error) {
        console.error('sync-user-claims error:', error);
        res.status(500).json({ error: 'Unable to sync access claims right now. Please try again shortly.' });
    }
};
