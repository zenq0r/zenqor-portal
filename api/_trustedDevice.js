const crypto = require('crypto');

const COOKIE_NAME = 'zenqor_trusted_device';
const SENSITIVE_ROLES = new Set(['Superadmin', 'Director', 'HR', 'Account', 'IT']);
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function trustedDurationMs(role) {
    return SENSITIVE_ROLES.has(role) ? SEVEN_DAYS_MS : THIRTY_DAYS_MS;
}

function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function parseCookie(header = '') {
    const cookies = String(header).split(';').map(part => part.trim().split('='));
    const match = cookies.find(([name]) => name === COOKIE_NAME);
    return match ? decodeURIComponent(match.slice(1).join('=')) : null;
}

function trustedCookie(token, maxAgeSeconds) {
    return `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

function clearTrustedCookie() {
    return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

async function revokeTrustedDevices(db, uid) {
    const snapshot = await db.collection('trusted_login_devices').where('uid', '==', uid).get();
    for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
        const batch = db.batch();
        snapshot.docs.slice(offset, offset + 400).forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
    return snapshot.size;
}

module.exports = {
    COOKIE_NAME, clearTrustedCookie, hashToken, parseCookie,
    revokeTrustedDevices, trustedCookie, trustedDurationMs
};
