const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { generateOtp, isAllowedPortalUrl, normalizeEmail, requiresOtpRole } = require('../api/_security');
const { getClientIp, parseUserAgent } = require('../api/_auditMetadata');
const { normalizeRetention, retentionDurationMs } = require('../api/_auditRetention');

test('OTP is always a six-digit string', () => {
    for (let i = 0; i < 100; i += 1) assert.match(generateOtp(), /^\d{6}$/);
});

test('OTP is mandatory for every provisioned RBAC role', () => {
    ['Superadmin', 'Director', 'HR', 'Account', 'IT', 'Staff', 'Client'].forEach(role => assert.equal(requiresOtpRole(role), true));
    assert.equal(requiresOtpRole('Unknown'), false);
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

test('audit metadata extracts the trusted client IP and readable browser details', () => {
    assert.equal(getClientIp({ 'x-vercel-forwarded-for': '203.0.113.8, 10.0.0.1' }), '203.0.113.8');
    const metadata = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36');
    assert.equal(metadata.browser, 'Google Chrome 140.0.0.0');
    assert.equal(metadata.os, 'Windows 10/11');
    assert.equal(metadata.device, 'Desktop');
});

test('audit retention validates supported units and calculates expiry duration', () => {
    assert.equal(normalizeRetention(2, 'hour').durationMs, 2 * 60 * 60 * 1000);
    assert.equal(retentionDurationMs({ value: 3, unit: 'week' }), 21 * 24 * 60 * 60 * 1000);
    assert.equal(normalizeRetention(0, 'day'), null);
    assert.equal(normalizeRetention(1, 'minute'), null);
});
