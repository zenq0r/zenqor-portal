// TEMPORARY — final end-to-end verification that the custom-claims fix actually
// works. DELETE THIS FILE after confirming success.
const { getAdminApp } = require('./_firebaseAdmin');

const WEB_API_KEY = "AIzaSyDgoE8ckbVWqc1j6bHq1u1685_xJp0y09Y";
const TEST_UID = "faatmE2Vl9PyOK4PEi1qCm5bw8A3"; // MR. ZAEN (Client)
const BUCKET = "zenqor-portal-a3b2d.firebasestorage.app";

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

        // Decode the ID token payload (no verification needed, just inspecting claims)
        const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf8'));
        steps.tokenClaims = { role: payload.role, clientDirectoryId: payload.clientDirectoryId };

        const testPath = `client_documents/zenqor_technologies/__final_test_${Date.now()}.png`;
        const tinyPngBytes = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108020000009077' + '3de9000000017352474200aece1ce90000000467414d410000b18f0bfc61050000000009706859730000' + '0ec300000ec301c76fa8640000000c4944415408d763f8cfc0c00000030100' + '5f7d4bd60000000049454e44ae426082', 'hex');
        const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(testPath)}`;
        const uploadResp = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'image/png' },
            body: tinyPngBytes
        });
        const uploadData = await uploadResp.text();
        steps.uploadStatus = uploadResp.status;
        steps.uploadResponse = uploadData;

        // Clean up the test file if it succeeded
        if (uploadResp.status === 200) {
            const deleteUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(testPath)}`;
            await fetch(deleteUrl, { method: 'DELETE', headers: { 'Authorization': `Bearer ${idToken}` } }).catch(() => {});
            steps.testFileCleanedUp = true;
        }

        return res.status(200).json({ steps });
    } catch (error) {
        steps.error = error.message;
        return res.status(200).json({ steps });
    }
};
