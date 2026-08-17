// TEMPORARY DIAGNOSTIC ENDPOINT — investigating why client_documents uploads fail
// with storage/unauthorized for every role. Mints a custom token for a hardcoded
// test UID, exchanges it for a real ID token, then attempts an actual Storage
// REST upload using that ID token so we see the real rule-evaluation result
// instead of guessing. DELETE THIS FILE once the investigation is done.
const { getAdminApp } = require('./_firebaseAdmin');

const WEB_API_KEY = "AIzaSyDgoE8ckbVWqc1j6bHq1u1685_xJp0y09Y";
const TEST_UID = "faatmE2Vl9PyOK4PEi1qCm5bw8A3"; // MR. ZAEN (Client)
const BUCKET = "zenqor-portal-a3b2d.firebasestorage.app";

module.exports = async (req, res) => {
    const steps = {};
    try {
        const admin = getAdminApp();

        // Step 1: mint a custom token for the test UID via Admin SDK
        const customToken = await admin.auth().createCustomToken(TEST_UID);
        steps.customTokenMinted = true;

        // Step 2: exchange it for a real ID token (this is what the client SDK does internally)
        const signInResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: customToken, returnSecureToken: true })
        });
        const signInData = await signInResp.json();
        steps.signInStatus = signInResp.status;
        if (!signInResp.ok) { steps.signInError = signInData; return res.status(200).json({ steps }); }
        const idToken = signInData.idToken;
        steps.idTokenObtained = true;

        // Step 3: attempt the actual Storage write with that ID token, exactly like the app does
        const testPath = `client_documents/zenqor_technologies/__diagnostic_test_${Date.now()}.png`;
        const tinyPngBytes = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108020000009077' + '3de9000000017352474200aece1ce90000000467414d410000b18f0bfc61050000000009706859730000' + '0ec300000ec301c76fa8640000000c4944415408d763f8cfc0c00000030100' + '5f7d4bd60000000049454e44ae426082', 'hex');
        const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(testPath)}`;
        const uploadResp = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'image/png'
            },
            body: tinyPngBytes
        });
        const uploadData = await uploadResp.text();
        steps.uploadStatus = uploadResp.status;
        steps.uploadResponse = uploadData;

        return res.status(200).json({ steps });
    } catch (error) {
        steps.error = error.message;
        return res.status(200).json({ steps });
    }
};
