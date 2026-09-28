# Panduan Setup Admin — LKTech

Dokumen ini menjelaskan cara mengaktifkan **Dashboard Admin** (Firebase Auth +
Firestore) pada website LKTech.

---

## 1. Aktifkan Autentikasi

1. Buka [Firebase Console](https://console.firebase.google.com) → pilih project
   **lktech-6b875**.
2. Menu **Build → Authentication → Get started**.
3. Aktifkan penyedia (Sign-in method):
   - **Email/Password** → Enable.
   - **Google** → Enable, lalu pilih *support email*.
4. Tambahkan domain aplikasi ke **Authorized domains** bila deploy ke domain baru
   (localhost sudah otomatis diizinkan).

## 2. Buat Akun Admin

- **Cara Email/Password:** menu Authentication → Users → **Add user** → isi email
  & password admin.
- **Cara Google:** cukup login sekali lewat dashboard, lalu akun otomatis dibuat.

Setelah akun dibuat, salin email-nya.

## 3. Isi `ADMIN_EMAILS`

Di `.env.local`, isi daftar email admin (dipisah koma). Hanya email di sini yang
boleh mengakses dashboard.

```env
ADMIN_EMAILS=admin@lktech.id,email-lain@domain.com
```

## 4. Konfigurasi Firebase Admin SDK

Diperlukan agar server dapat memverifikasi admin & mengelola lead.

1. Firebase Console → **Project Settings → Service Accounts**.
2. Klik **Generate new private key** → unduh file JSON.
3. Ambil 3 nilai dari file JSON tersebut ke `.env.local`:

```env
FIREBASE_ADMIN_PROJECT_ID=lktech-6b875
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@lktech-6b875.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

> **Penting:** nilai `private_key` berisi baris baru. Tulis sebagai satu baris
> dengan `\n` sebagai pengganti baris baru, dan apit dengan tanda kutip ganda.
> Jangan pernah commit file ini — `.env*.local` sudah di-`.gitignore`.

## 5. Deploy Security Rules

Salin isi `firestore.rules` ke Firebase Console → **Firestore Database → Rules →
Publish**. Atau via Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

## 6. Akses Dashboard

1. Jalankan `npm run dev`.
2. Buka **http://localhost:3000/admin/login**.
3. Login dengan Google atau Email/Password.

## 7. Cloudinary (Upload Gambar)

Digunakan untuk mengunggah gambar portofolio & banner dari dashboard.

1. Buat akun di [Cloudinary](https://cloudinary.com) → catat **Cloud name**,
   **API Key**, dan **API Secret** dari halaman Dashboard.
2. Isi `.env.local`:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-api-secret
```

3. Restart dev server → buka **/admin/media** untuk mengunggah gambar.

> **Keamanan:** API Secret hanya ada di server. Browser meminta *signature*
> sementara ke `/api/cloudinary/sign` (dilindungi admin), lalu mengunggah file
> langsung ke Cloudinary. Secret tidak pernah terekspos.

---

## Ringkasan Alur

| Bagian | Perilaku |
| --- | --- |
| Belum login | `/admin/*` dialihkan ke `/admin/login` |
| Login tapi email tidak di `ADMIN_EMAILS` | API menolak dengan **403** |
| Admin SDK belum diisi | API mengembalikan **503** dengan pesan jelas |
| Admin sah | Bisa lihat, ubah status, dan hapus lead |
| Upload gambar | Signature dibuat di server → upload langsung ke Cloudinary |

## Keamanan

- Lead **tidak dapat dibaca publik** (security rules).
- Verifikasi admin memakai **ID token** Firebase yang ditandatangani, dicek di
  server via Admin SDK — tidak bisa dipalsukan dari browser.
- Kredensial admin & Cloudinary secret bersifat server-only (`server-only`
  import) dan tidak pernah masuk ke bundle client.
- Upload gambar hanya bisa dimulai oleh admin terverifikasi.
