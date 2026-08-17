const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { generateOtp, isAllowedPortalUrl, normalizeEmail } = require('../api/_security');

test('OTP is always a six-digit string', () => {
    for (let i = 0; i < 100; i += 1) assert.match(generateOtp(), /^\d{6}$/);
});

test('portal URL validation rejects lookalike and insecure domains', () => {
    assert.equal(isAllowedPortalUrl('https://portal.zenq0r.com/path'), true);
    assert.equal(isAllowedPortalUrl('https://zenq0r.com'), true);
    assert.equal(isAllowedPortalUrl('https://zenq0r.com.evil.test'), false);
    assert.equal(isAllowedPortalUrl('https://evilzenq0r.com'), false);
    assert.equal(isAllowedPortalUrl('http://portal.zenq0r.com'), false);
});

test('email normalization trims, lowercases, and rejects malformed input', () => {
    assert.equal(normalizeEmail(' User@Example.COM '), 'user@example.com');
    assert.equal(normalizeEmail('not-an-email'), null);
    assert.equal(normalizeEmail(null), null);
});

test('Firebase Admin initialization fails clearly when credentials are absent', () => {
    const modulePath = path.join(__dirname, '..', 'api', '_firebaseAdmin.js');
    const script = `delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY; require(${JSON.stringify(modulePath)}).getAdminApp()`;
    const result = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set/);
    assert.doesNotMatch(result.stderr, /reading 'length'/);
});
