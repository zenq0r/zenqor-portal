// TEMPORARY — one-time backfill of custom claims for users that existed before
// the sync-user-claims mechanism was introduced. DELETE THIS FILE after running once.
const { getAdminApp } = require('./_firebaseAdmin');

const UIDS = [
    "7MYX3TR8I0XwVgwJnNqbAvsIbJw1",
    "FcGhCCBBufd3VmURXgqQv4fFeb02",
    "YVY0peVCmxgEwHPz16J9PxeESMB3",
    "faatmE2Vl9PyOK4PEi1qCm5bw8A3",
    "j2JBU0M5QeQa9JKmeE0FLDjyTOx1",
    "ssXbaE1hWTQCuJTTxvaBch6fodu1"
];

module.exports = async (req, res) => {
    const admin = getAdminApp();
    const results = [];
    for (const uid of UIDS) {
        try {
            const doc = await admin.firestore().collection('users').doc(uid).get();
            if (!doc.exists) { results.push({ uid, skipped: 'no user doc' }); continue; }
            const role = doc.data().role || 'Staff';
            const email = doc.data().email || '';
            const claims = { role };
            if (role === 'Client' && email) {
                const custSnap = await admin.firestore().collection('customers').where('clientEmail', '==', email).limit(1).get();
                if (!custSnap.empty) claims.clientDirectoryId = custSnap.docs[0].id;
            }
            await admin.auth().setCustomUserClaims(uid, claims);
            results.push({ uid, email, claims });
        } catch (error) {
            results.push({ uid, error: error.message });
        }
    }
    res.status(200).json({ results });
};
