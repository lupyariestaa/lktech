# Panduan Setup Logo Teknologi (Section "Teknologi yang Kami Gunakan")

Section di beranda menampilkan **marquee logo teknologi** (React, Next.js, Laravel, Python, dll).
Saat ini logonya masih **placeholder** (kotak warna + inisial nama). Panduan ini menjelaskan cara
memasukkan **logo asli** satu per satu.

> Butuh bantuan edit kode? File yang relevan:
> - Daftar teknologi: `src/lib/content.ts` (cari `TECH_STACK`)
> - Folder aset logo: `public/tech/`
> - Komponen: `src/components/technology-logo.tsx` & `src/components/sections/technologies.tsx`

---

## Ringkasan alur

1. Unduh file logo (SVG lebih baik daripada PNG).
2. Simpan ke `public/tech/<nama-file>` (mis. `react.svg`).
3. Isi field `logo` pada entri di `TECH_STACK` (mis. `"/tech/react.svg"`).
4. Simpan file → cek di beranda → commit & push.

Selama `logo` masih `""`, kartu menampilkan placeholder otomatis. Jadi kamu bisa
melakukannya **bertahap** — tidak harus sekaligus.

---

## Langkah detail

### 1. Unduh logo
Sumber rekomendasi (gratis & resmi):
- **Simple Icons** — https://simpleicons.org/ (SVG, satu warna, lengkap). Cari nama teknologi → klik → **Download SVG**.
- **Situs resmi brand** — cari "React logo svg", "Laravel logo svg", dsb. dari halaman brand/press kit.
- **SVG Logos** — https://svgporn.com/ (banyak logo teknologi berwarna).

Tips:
- Utamakan **SVG** (tajam di semua ukuran & ukuran file kecil).
- Kalau hanya dapat **PNG**, pilih yang **latar transparan** dan resolusi ≥ 128×128.
- Beri nama file **huruf kecil tanpa spasi**, mis. `nextjs.svg`, `tailwindcss.svg`.

### 2. Simpan file ke folder `public/tech/`
Taruh file di:
```
public/tech/<nama-file>
```
Contoh:
```
public/tech/react.svg
public/tech/nextjs.svg
public/tech/laravel.svg
public/tech/python.svg
```
> Folder `public/` adalah root situs. File `public/tech/react.svg` diakses lewat URL `/tech/react.svg`.

### 3. Daftarkan di `TECH_STACK`
Buka `src/lib/content.ts`, cari blok `TECH_STACK`. Setiap entri punya `name`, `logo`, dan `color`.

Ganti `logo: ""` menjadi path file, mis.:
```ts
export const TECH_STACK: TechItem[] = [
  { name: "React", logo: "/tech/react.svg", color: "#61DAFB" },
  { name: "Next.js", logo: "/tech/nextjs.svg", color: "#0A0F1E" },
  { name: "TypeScript", logo: "", color: "#3178C6" }, // masih placeholder
  // ...
];
```

Keterangan field:
| Field   | Arti                                                                          |
| ------- | ----------------------------------------------------------------------------- |
| `name`  | Nama teknologi yang tampil di sebelah logo.                                   |
| `logo`  | Path file di public, mis. `"/tech/react.svg"`. **Kosong = placeholder.**      |
| `color` | Warna brand. Dipakai untuk placeholder & aksen. Biarkan seakurat mungkin.     |

### 4. Menambah / menghapus teknologi
- **Tambah:** salin satu baris entri, ubah `name`, `logo`, `color`.
- **Hapus:** hapus barisnya. (Daftar otomatis digandakan di komponen untuk animasi — tidak perlu digandakan manual.)

### 5. Cek & deploy
```bash
npm run dev      # buka http://localhost:3000 → lihat section teknologi
npm run build    # pastikan tidak ada error sebelum push
git add . && git commit -m "chore: tambah logo teknologi" && git push
```
Vercel akan otomatis men-deploy setelah push ke `main`.

---

## Catatan penting

- **Logo gagal dimuat?** Kalau path salah atau file tidak ada, kartu otomatis
  kembali menampilkan placeholder (ada fallback `onError`). Cek ulang nama & lokasi file.
- **Warna logo SVG satu-warna (dari Simple Icons):** biasanya berwarna hitam/monokrom.
  Itu tetap terlihat bagus di kartu putih. Kalau mau versi berwarna, pakai sumber seperti SVG Logos.
- **Keamanan/legal:** logo pihak ketiga hanya untuk menunjukkan teknologi yang dipakai.
  Hindari mengubah logo brand. Beberapa brand punya aturan (brand guideline) — umumnya aman untuk dipakai sebagai "powered by".
- **Ukuran:** kartu menampilkan logo sekitar 28×28 px (dibungkus kotak 36×36). SVG otomatis pas.

---

## Daftar file logo yang disarankan (opsional, unduh satu per satu)

| Teknologi      | Nama file disarankan   | Sumber (contoh)        |
| -------------- | ---------------------- | ---------------------- |
| React          | `react.svg`            | simpleicons.org/react  |
| Next.js        | `nextjs.svg`           | simpleicons.org/nextdotjs |
| TypeScript     | `typescript.svg`       | simpleicons.org/typescript |
| Tailwind CSS   | `tailwindcss.svg`      | simpleicons.org/tailwindcss |
| Vue            | `vue.svg`              | simpleicons.org/vuedotjs |
| Laravel        | `laravel.svg`          | simpleicons.org/laravel |
| Python         | `python.svg`           | simpleicons.org/python |
| Node.js        | `nodejs.svg`           | simpleicons.org/nodedotjs |
| Firebase       | `firebase.svg`         | simpleicons.org/firebase |
| Flutter        | `flutter.svg`          | simpleicons.org/flutter |
| Figma          | `figma.svg`            | simpleicons.org/figma |
| PostgreSQL     | `postgresql.svg`       | simpleicons.org/postgresql |

Setelah file ada di `public/tech/`, isi `logo` di `TECH_STACK` sesuai nama file.
