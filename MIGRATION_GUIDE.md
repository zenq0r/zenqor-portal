# ZENQOR Enterprise v2.1 — Panduan Migrasi Keselamatan

## Perubahan Kritikal Yang Dilakukan

### [ISU #1] Firestore Rules — `isAuthenticated()` Dibuang `|| true`
**SEBELUM:** `return request.auth != null || true;` ← Semua orang boleh akses!
**SELEPAS:** `return request.auth != null;` ← Firebase Auth wajib

### [ISU #2] Password Tidak Lagi Disimpan Plaintext
- `users` collection dalam Firestore kini hanya menyimpan: `name`, `email`, `role`
- Password diurus sepenuhnya oleh Firebase Authentication
- Backup JSON tidak lagi mengandungi password

### [ISU #3] Login Menggunakan Firebase Auth
- `signInWithEmailAndPassword()` — semakan berlaku di server Google
- `onAuthStateChanged()` — session dipantau secara selamat
- Feature tukar kata laluan dengan `reauthenticateWithCredential` + `updatePassword`

### [ISU #4] API Key Protection
- Firebase App Check (ReCaptcha v3) disediakan (perlu aktifkan — lihat bawah)
- Domain restriction perlu diset di Google Cloud Console

---

## LANGKAH WAJIB SEBELUM DEPLOY

### Langkah 1: Migrate Pengguna ke Firebase Authentication

Buka Firebase Console → Authentication → Users → Add User
Cipta akaun untuk setiap pengguna dengan emel dan kata laluan baru.

Kemudian, untuk setiap pengguna, simpan metadata di Firestore
di bawah path `users/{uid}` (bukan email lagi, tapi UID Firebase):

```json
{
  "name": "Nama Pengguna",
  "email": "nama@zenq0r.com",
  "role": "Superadmin"
}
```

**PENTING:** Document ID dalam `users/` collection kini mestilah **Firebase UID**
(contoh: `abc123xyz`) bukan email. Ini penting supaya Firestore rules berfungsi.

### Langkah 2: Aktifkan Firebase App Check

1. Pergi ke https://www.google.com/recaptcha/admin/create
2. Pilih reCAPTCHA v3, masukkan domain anda
3. Salin Site Key
4. Dalam `firebase-config.js`, uncomment bahagian `initializeAppCheck` dan
   gantikan `RECAPTCHA_SITE_KEY_ANDA` dengan key sebenar
5. Aktifkan App Check di Firebase Console → App Check → Register App

### Langkah 3: Restrict API Key di Google Cloud

1. Buka https://console.cloud.google.com/apis/credentials
2. Klik pada "Browser key (auto created by Firebase)"
3. Dalam "Application restrictions" → pilih "HTTP referrers"
4. Tambah domain:
   - `https://zenqor-operation.vercel.app/*`
   - `http://localhost/*` (development sahaja)
5. Simpan

### Langkah 4: Deploy Firestore Rules Baharu

```bash
firebase deploy --only firestore:rules
```

### Langkah 5: Padam Data Lama Yang Mengandungi Password

Di Firebase Console → Firestore → `users` collection:
- Semak setiap dokumen dan pastikan tiada field `password`
- Padam field `password` jika masih ada

---

## NOTA TAMBAHAN

- Modal "Tambah Pengguna" dalam UI kini hanya mengemas kini metadata (name, role)
- Untuk cipta akaun baharu, gunakan Firebase Console atau Firebase Admin SDK
- Fungsi "Tukar Kata Laluan" tersedia dalam Profile tab
