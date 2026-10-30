# LMS SMA Negeri Prabsky 02 Konoha

Versi baru dari LMS Laravel (`LMS SMA`), ditulis ulang dengan Next.js 16 (App Router), PostgreSQL,
Prisma 7, dan komponen shadcn/ui. Arah desain ada di [DESIGN.md](DESIGN.md).

## Menjalankan di komputer lokal

Butuh Node.js 20.9 atau lebih baru. Database memakai Postgres lokal dari `prisma dev`, jadi tidak
perlu memasang PostgreSQL ke sistem.

```bash
npm install
```

```bash
npm run db:start
```

Perintah di atas mencetak URL koneksi `postgres://postgres:postgres@localhost:<port>/template1`.
Salin `.env.example` menjadi `.env`, lalu sesuaikan port pada `DATABASE_URL` bila berbeda.
`SHADOW_DATABASE_URL` memakai port berikutnya dari server yang sama (lihat `npx prisma dev ls`);
tanpa itu `db:migrate` gagal karena shadow database ikut berisi tabel dari `template1`.

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Buka http://localhost:3000 dan masuk dengan akun admin bawaan dari seeder lama:
`admin@mail.io` / `admin123`. Ganti password ini di halaman Profil.

### Data dummy

Untuk mencoba semua fitur dengan isi sekolah rekaan (12 mata pelajaran, 16 guru, 6 kelas,
120 siswa, jadwal, ujian, absensi, nilai, dan akun yang sudah terhubung):

```bash
npm run db:dummy
```

Perintah ini **menghapus semua data kecuali akun admin** lalu mengisi ulang, jadi jangan jalankan
ke database sekolah sungguhan. Email akun dibentuk dari nama (`nama.belakang@sman12.test`);
password guru dan siswa ada di bagian atas `prisma/dummy.ts`, dan contoh email dicetak di akhir
perintah.

Untuk pindah ke PostgreSQL sungguhan, ganti `DATABASE_URL` dan naikkan `DATABASE_POOL_MAX`
(server `prisma dev` hanya menerima satu koneksi).

## Peran dan akses

Kelas yang terlihat ditentukan dari data yang terhubung ke akun (lihat `src/lib/lingkup.ts`):

| Peran | Akses |
|---|---|
| Admin | Semua menu dan semua kelas, termasuk bahan ajar sekolah |
| Guru | Kelas belajar yang ia ajar (pertemuan, materi, absensi, tugas, kuis, ujian online, rekap nilai); bank soal mapelnya; jadwal mengajar; nilai ujian hanya untuk kelas dan mata pelajaran yang ia ajar; jadwal ujian kelas yang ia ajar dan yang ia awasi; data guru; rapor |
| Wali Kelas | Kelas perwalian: jadwal pelajaran, nilai ujian semua mata pelajaran, sikap, ekstrakurikuler, prestasi, rapor. Kelas lain yang ia ajar: kelas belajar dan nilai ujian mata pelajarannya, sama seperti guru. Mapel lain di kelas perwaliannya bisa dilihat. Bank soal mapelnya. Juga jadwal mengajar dan jadwal ujian |
| Siswa | Kelas belajar mapel di kelasnya (materi, absen online, tugas, kuis, ujian online, nilai), jadwal pelajaran kelasnya, jadwal ujian, dan rapor miliknya sendiri |

## Kelas belajar (pembelajaran online)

Setiap mata pelajaran di setiap kelas (diambil dari jadwal pelajaran) punya halaman **Kelas belajar**:

- **Pertemuan dan materi.** Guru membuat pertemuan ke-N. Bahan ajar sekolah untuk mapel, tingkat
  (X, XI, XII), dan nomor pertemuan itu langsung tampil; admin menyusunnya di menu **Bahan ajar**.
  Guru menambah materi sendiri per pertemuan: dokumen (PDF, Word, PowerPoint, gambar, maks 25 MB)
  atau video (unggah MP4/WebM/MOV maks 300 MB, atau link YouTube).
- **Absensi.** Diisi guru per pertemuan, atau guru membuka **absen online** beberapa menit dan siswa
  menekan "Saya hadir". Status yang sudah diisi guru tidak tertimpa absen online.
- **Tugas dan kuis** dengan batas waktu: unggah berkas jawaban, atau jawab soal di LMS (pilihan
  ganda dinilai otomatis, essay dinilai guru) dengan durasi, acak soal, dan pembahasan.
- **Bank soal.** Soal ditulis di bank atau langsung di tugas (dengan pilihan simpan ke bank), lalu
  dipakai ulang lewat "Ambil dari bank soal". Soal terkunci setelah ada siswa yang mengerjakan.
- **Ujian online.** Admin menjadwalkan ujian; guru mapel menekan "Siapkan online" di Jadwal ujian
  dan memilih soal atau unggah hasil. Siswa hanya bisa mengerjakan di jam ujian.
- **Layar mengerjakan**: satu soal per layar, timer dari jam server, peta nomor soal, tanda
  ragu-ragu, simpan otomatis, ringkasan sebelum mengumpulkan, dan terkumpul otomatis saat waktu habis.
- **Rekap nilai** per kelas belajar, lalu **Hitung ke nilai rapor** dengan bobot tugas, kuis, dan
  ujian. Yang tidak dikumpulkan bernilai 0; perhitungan ditolak selama masih ada jawaban yang belum dinilai.

Berkas tersimpan di folder `storage/` (tidak masuk git) dan hanya bisa diunduh oleh yang berhak
melihat pertemuan atau tugasnya. Unggahan lewat `/api/unggah`, karena server action dan proxy
membatasi ukuran body.

## Produksi (Vercel + Supabase)

- Database memakai proyek Supabase yang juga dipakai aplikasi lain, jadi semua tabel LMS ada di
  schema `lms`. Aplikasi masuk sebagai role `lms_app`, pemilik schema itu, dengan
  `search_path = lms`. `DATABASE_URL` memakai pooler transaksi (port 6543) dan diakhiri
  `?schema=lms&sslmode=require&uselibpqcompat=true`.
- Migrasi dijalankan lewat pooler session (port 5432), dengan URL yang diakhiri `?schema=lms&sslmode=require`:
  `DATABASE_URL="<url sesi>" npx prisma migrate deploy`.
- Berkas unggahan disimpan di bucket privat `berkas` di Supabase Storage. Browser mengunggah
  langsung ke URL bertanda tangan, sehingga batas 4,5 MB per permintaan di Vercel tidak berlaku.
  Batas per berkas 50 MB. Unduhan tetap lewat `/berkas/[id]`, yang memeriksa hak akses lalu
  mengarahkan ke URL bertanda tangan selama lima menit.
- Variabel di Vercel: `DATABASE_URL`, `DATABASE_POOL_MAX` (misalnya 3), `SESSION_SECRET`,
  `SUPABASE_URL`, dan `SUPABASE_SECRET_KEY`.

## Perubahan dibanding versi Laravel

- "Lihat nilai lapor" dan "Lihat nilai ujian" digabung menjadi satu halaman **Rapor siswa** yang bisa dicetak.
- Absensi diisi per pertemuan mata pelajaran, sekaligus untuk satu kelas (satu tombol simpan), bukan satu per satu siswa.
- Jadwal menolak slot yang bentrok di kelas yang sama atau untuk guru yang sama.
- Wali kelas sekarang benar-benar tersimpan dan diambil dari data guru (di versi lama formnya tidak menyimpan).
- Menghapus mata pelajaran tidak lagi ikut menghapus guru pengampunya.
- Nilai ujian dan nilai sikap memakai satu catatan per siswa, mata pelajaran/jenis, dan semester; menyimpan ulang akan memperbarui.
- Mengubah akun tidak lagi memaksa mengganti password.
- Akun siswa wajib dihubungkan ke nomor induknya dan hanya bisa membuka rapor sendiri (di versi lama siswa bisa membuka rapor siapa pun).
- Akun guru dan wali kelas bisa dihubungkan ke data guru, sehingga jadwal mengajar dan guru penilai langsung terisi.
- Hari dan status kehadiran menjadi enum, bukan tabel `hari` dan `kehadiran`.
- Jadwal ujian disusun admin per kelas, dengan jenis (UTS, UAS, Ujian Sekolah), semester, ruang, dan pengawas. Bentrok kelas, ruang, atau pengawas di jam yang sama ditolak. Siswa, guru, dan wali kelas hanya melihat ujian kelasnya dan ujian yang mereka awasi.

## Struktur

- `prisma/schema.prisma`: skema database, `prisma/seed.ts`: akun admin awal
- `src/app/(app)/*`: halaman yang butuh login, satu folder per fitur (`page.tsx` + `actions.ts`)
- `src/lib/auth.ts`, `src/lib/session.ts`, `src/proxy.ts`: sesi berbasis cookie dan cek peran
- `src/components/forms.tsx`: dialog form, konfirmasi hapus, dan error per field yang dipakai semua fitur
