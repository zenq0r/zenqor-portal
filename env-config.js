// ================================================================
// env-config.js — ZENQOR ENTERPRISE v2.0
//
// HOW THIS WORKS:
// Vercel serves this file after replacing %%PLACEHOLDER%% values
// with real environment variables via vercel.json rewrites.
//
// SETUP STEPS:
// 1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
// 2. Add each variable below with its real value
// 3. Redeploy — Vercel injects the values automatically
//
// WARNING: Never commit real values to this file.
//          This file is a TEMPLATE only.
// ================================================================

window.__ENV__ = {
    FIREBASE_API_KEY:         "%%FIREBASE_API_KEY%%",
    FIREBASE_AUTH_DOMAIN:     "%%FIREBASE_AUTH_DOMAIN%%",
    FIREBASE_PROJECT_ID:      "%%FIREBASE_PROJECT_ID%%",
    FIREBASE_STORAGE_BUCKET:  "%%FIREBASE_STORAGE_BUCKET%%",
    FIREBASE_MESSAGING_ID:    "%%FIREBASE_MESSAGING_ID%%",
    FIREBASE_APP_ID:          "%%FIREBASE_APP_ID%%",
    FIREBASE_MEASUREMENT_ID:  "%%FIREBASE_MEASUREMENT_ID%%",
    RECAPTCHA_SITE_KEY:       "%%RECAPTCHA_SITE_KEY%%"
};
