// Generic branded-email notifier for portal workflow events (claim/voucher
// submitted or decided, client document shared, project stage changed, client
// message sent). Requires a valid Firebase ID token so only signed-in portal
// users can trigger it. Recipients are restricted server-side to emails that
// actually belong to a provisioned staff user or a known client record —
// a signed-in caller cannot use this to relay mail to an arbitrary address.
const { getAdminApp } = require('./_firebaseAdmin');

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buildEmailHtml({ heading, message, ctaLabel, ctaUrl }) {
    const safeCtaUrl = typeof ctaUrl === 'string' && /^https:\/\/[a-z0-9.-]*zenq0r\.com/i.test(ctaUrl) ? ctaUrl : null;
    const ctaBlock = safeCtaUrl ? `<div style="text-align: center; margin: 0 0 28px;">
      <a href="${safeCtaUrl}" style="display: inline-block; background-color: #14B8A6; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; padding: 15px 40px; border-radius: 10px;">${escapeHtml(ctaLabel || 'OPEN PORTAL')}</a>
    </div>` : '';
    return `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 0; background-color: #ffffff; border-radius: 16px; border: 1px solid #E5E7EB; overflow: hidden;">
  <div style="background-color: #0B1E36; padding: 28px 32px; text-align: center;">
    <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">ZENQOR</span><span style="font-size: 20px; font-weight: 800; color: #14B8A6; letter-spacing: 0.5px;"> HRMS/CDTS</span>
  </div>
  <div style="padding: 36px 32px;">
    <h2 style="color: #0B1E36; font-size: 19px; margin: 0 0 20px; text-align: center;">${escapeHtml(heading)}</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0 0 28px; white-space: pre-wrap;">${escapeHtml(message)}</p>
    ${ctaBlock}
  </div>
  <div style="background-color: #F8FAFC; padding: 20px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
    <p style="color: #94A3B8; font-size: 11px; margin: 0;">© ZENQOR HRMS/CDTS · Zenqor Technologies · This is an automated notification.</p>
  </div>
</div>`;
}

async function isKnownRecipient(db, email) {
    const lower = email.toLowerCase();
    const [byUserEmail, byClientEmail, byAdditionalClientEmail] = await Promise.all([
        db.collection('users').where('email', '==', lower).limit(1).get(),
        db.collection('customers').where('clientEmail', '==', lower).limit(1).get(),
        db.collection('customers').where('additionalClientEmails', 'array-contains', lower).limit(1).get()
    ]);
    return !byUserEmail.empty || !byClientEmail.empty || !byAdditionalClientEmail.empty;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const authHeader = req.headers.authorization || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!idToken) { res.status(401).json({ error: 'Missing authorization token.' }); return; }

        const admin = getAdminApp();
        await admin.auth().verifyIdToken(idToken); // just needs to be a real signed-in user
        const db = admin.firestore();

        const { to, subject, heading, message, ctaLabel, ctaUrl } = req.body || {};
        const candidates = (Array.isArray(to) ? to : [to]).filter(e => typeof e === 'string' && e.includes('@'));
        if (!candidates.length) { res.status(400).json({ error: 'At least one valid recipient email is required.' }); return; }
        if (!subject || !heading || !message) { res.status(400).json({ error: 'subject, heading and message are required.' }); return; }

        const knownChecks = await Promise.all(candidates.map(e => isKnownRecipient(db, e)));
        const recipients = candidates.filter((_, i) => knownChecks[i]);
        if (!recipients.length) { res.status(400).json({ error: 'No recipient matches a known staff or client account.' }); return; }

        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) throw new Error('RESEND_API_KEY environment variable is not set.');

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: 'Zenqor Technologies <noreply@zenq0r.com>',
                to: recipients,
                subject: String(subject).slice(0, 200),
                html: buildEmailHtml({ heading, message, ctaLabel, ctaUrl })
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Resend send failed: ${response.status} ${errText}`);
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('notify error:', error);
        // Non-fatal by design: the caller (app.js) treats this as fire-and-forget
        // and never blocks the underlying workflow action on it.
        res.status(500).json({ error: 'Unable to send notification right now.' });
    }
};
