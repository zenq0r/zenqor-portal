const crypto = require('crypto');

function generateOtp() {
    return String(crypto.randomInt(100000, 1000000));
}

function isAllowedPortalUrl(value) {
    if (typeof value !== 'string') return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' &&
            (url.hostname === 'zenq0r.com' || url.hostname.endsWith('.zenq0r.com'));
    } catch (_) {
        return false;
    }
}

function normalizeEmail(value) {
    if (typeof value !== 'string') return null;
    const email = value.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

module.exports = { generateOtp, isAllowedPortalUrl, normalizeEmail };
