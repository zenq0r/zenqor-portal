const RETENTION_UNITS_MS = Object.freeze({
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000
});

const DEFAULT_RETENTION = Object.freeze({ value: 30, unit: 'day' });

function normalizeRetention(value, unit) {
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 999) return null;
    if (!Object.hasOwn(RETENTION_UNITS_MS, unit)) return null;
    return { value: numericValue, unit, durationMs: numericValue * RETENTION_UNITS_MS[unit] };
}

function retentionDurationMs(setting) {
    return normalizeRetention(setting?.value, setting?.unit)?.durationMs ||
        DEFAULT_RETENTION.value * RETENTION_UNITS_MS[DEFAULT_RETENTION.unit];
}

module.exports = { DEFAULT_RETENTION, RETENTION_UNITS_MS, normalizeRetention, retentionDurationMs };
