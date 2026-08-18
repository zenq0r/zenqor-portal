const crypto = require('crypto');

function rateLimitId(scope, key) {
    return crypto.createHash('sha256').update(`${scope}:${key}`).digest('hex');
}

async function enforceRateLimit(db, { scope, key, limit, windowMs }) {
    if (!scope || !key || !Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs < 1000) {
        throw new Error('Invalid rate-limit configuration.');
    }
    const ref = db.collection('security_rate_limits').doc(rateLimitId(scope, key));
    const now = Date.now();
    return db.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref);
        const existing = snapshot.exists ? snapshot.data() : null;
        const windowStartedAt = Number(existing?.windowStartedAt || 0);
        if (!windowStartedAt || now - windowStartedAt >= windowMs) {
            transaction.set(ref, { scope, count: 1, windowStartedAt: now, updatedAt: new Date(now) });
            return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
        }
        const count = Number(existing?.count || 0);
        if (count >= limit) {
            return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - windowStartedAt)) / 1000)) };
        }
        transaction.update(ref, { count: count + 1, updatedAt: new Date(now) });
        return { allowed: true, remaining: Math.max(0, limit - count - 1), retryAfterSeconds: 0 };
    });
}

module.exports = { enforceRateLimit, rateLimitId };
