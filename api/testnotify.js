// TEMPORARY — verifies the new /api/notify endpoint actually sends a real
// email end-to-end. DELETE THIS FILE after confirming success.
const { getAdminApp } = require('./_firebaseAdmin');

const WEB_API_KEY = "AIzaSyDgoE8ckbVWqc1j6bHq1u1685_xJp0y09Y";
const TEST_UID = "j2JBU0M5QeQa9JKmeE0FLDjyTOx1"; // Director (annas.nazmi@zenq0r.com)

module.exports = async (req, res) => {
    const steps = {};
    try {
        const admin = getAdminApp();
        const customToken = await admin.auth().createCustomToken(TEST_UID);
        const signInResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Referer': 'https://www.portal.zenq0r.com/' },
            body: JSON.stringify({ token: customToken, returnSecureToken: true })
        });
        const signInData = await signInResp.json();
        steps.signInStatus = signInResp.status;
        if (!signInResp.ok) { steps.signInError = signInData; return res.status(200).json({ steps }); }
        const idToken = signInData.idToken;

        const notifyResp = await fetch('https://www.portal.zenq0r.com/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({
                to: 'annas.nazmi@zenq0r.com',
                subject: 'Test: Notification System Verification',
                heading: 'Notification System Working',
                message: 'This is a one-time test confirming the new email notification system is fully functional end-to-end. Safe to ignore.'
            })
        });
        steps.notifyStatus = notifyResp.status;
        steps.notifyResponse = await notifyResp.json();
        return res.status(200).json({ steps });
    } catch (error) {
        steps.error = error.message;
        return res.status(200).json({ steps });
    }
};
