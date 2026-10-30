-- CreateEnum
CREATE TYPE "Tingkat" AS ENUM ('X', 'XI', 'XII');

-- CreateEnum
CREATE TYPE "TipeMateri" AS ENUM ('DOKUMEN', 'VIDEO');

-- CreateEnum
CREATE TYPE "JenisAsesmen" AS ENUM ('TUGAS', 'KUIS', 'UJIAN');

-- CreateEnum
CREATE TYPE "ModeAsesmen" AS ENUM ('SOAL', 'UPLOAD');

-- CreateEnum
CREATE TYPE "TipeSoal" AS ENUM ('PG', 'ESSAY');

-- AlterTable
ALTER TABLE "Absensi" ADD COLUMN     "online" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
-- Existing classes get their grade from the name prefix (XII before XI before X).
ALTER TABLE "Kelas" ADD COLUMN     "tingkat" "Tingkat";
UPDATE "Kelas" SET "tingkat" = CASE
  WHEN "nama" LIKE 'XII%' THEN 'XII'::"Tingkat"
  WHEN "nama" LIKE 'XI%' THEN 'XI'::"Tingkat"
  ELSE 'X'::"Tingkat" END;
ALTER TABLE "Kelas" ALTER COLUMN "tingkat" SET NOT NULL;

-- Old meetings had no subject and cannot be mapped to one; they and their attendance are removed.
DELETE FROM "Pertemuan";

-- AlterTable
ALTER TABLE "Pertemuan" ADD COLUMN     "absenOnlineBuka" TIMESTAMP(3),
ADD COLUMN     "absenOnlineTutup" TIMESTAMP(3),
ADD COLUMN     "guruId" INTEGER,
ADD COLUMN     "pelajaranId" INTEGER NOT NULL,
ADD COLUMN     "urutan" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Berkas" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "ukuran" INTEGER NOT NULL,
    "kunci" TEXT NOT NULL,
    "pengunggahId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Berkas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BahanAjar" (
    "id" SERIAL NOT NULL,
    "pelajaranId" INTEGER NOT NULL,
    "tingkat" "Tingkat" NOT NULL,
    "urutan" INTEGER NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BahanAjar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Materi" (
    "id" SERIAL NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL DEFAULT '',
    "tipe" "TipeMateri" NOT NULL,
    "berkasId" INTEGER,
    "url" TEXT,
    "bahanAjarId" INTEGER,
    "pertemuanId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Materi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asesmen" (
    "id" SERIAL NOT NULL,
    "jenis" "JenisAsesmen" NOT NULL,
    "mode" "ModeAsesmen" NOT NULL,
    "judul" TEXT NOT NULL,
    "instruksi" TEXT NOT NULL DEFAULT '',
    "semester" "Semester" NOT NULL,
    "kelasId" INTEGER NOT NULL,
    "pelajaranId" INTEGER NOT NULL,
    "guruId" INTEGER,
    "pertemuanId" INTEGER,
    "jadwalUjianId" INTEGER,
    "lampiranId" INTEGER,
    "dibuka" TIMESTAMP(3) NOT NULL,
    "ditutup" TIMESTAMP(3) NOT NULL,
    "durasiMenit" INTEGER,
    "acakSoal" BOOLEAN NOT NULL DEFAULT false,
    "tampilkanHasil" BOOLEAN NOT NULL DEFAULT true,
    "terbit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asesmen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Soal" (
    "id" SERIAL NOT NULL,
    "pelajaranId" INTEGER NOT NULL,
    "tingkat" "Tingkat" NOT NULL,
    "tipe" "TipeSoal" NOT NULL,
    "pertanyaan" TEXT NOT NULL,
    "opsi" TEXT[],
    "kunci" INTEGER,
    "pembahasan" TEXT NOT NULL DEFAULT '',
    "diBank" BOOLEAN NOT NULL DEFAULT true,
    "pembuatId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Soal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsesmenSoal" (
    "asesmenId" INTEGER NOT NULL,
    "soalId" INTEGER NOT NULL,
    "urutan" INTEGER NOT NULL,
    "bobot" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AsesmenSoal_pkey" PRIMARY KEY ("asesmenId","soalId")
);

-- CreateTable
CREATE TABLE "Pengerjaan" (
    "id" SERIAL NOT NULL,
    "asesmenId" INTEGER NOT NULL,
    "siswaId" INTEGER NOT NULL,
    "mulai" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batas" TIMESTAMP(3) NOT NULL,
    "dikumpulkan" TIMESTAMP(3),
    "berkasId" INTEGER,
    "nilai" DOUBLE PRECISION,
    "catatan" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengerjaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jawaban" (
    "pengerjaanId" INTEGER NOT NULL,
    "soalId" INTEGER NOT NULL,
    "pilihan" INTEGER,
    "teks" TEXT,
    "ragu" BOOLEAN NOT NULL DEFAULT false,
    "skor" DOUBLE PRECISION,

    CONSTRAINT "Jawaban_pkey" PRIMARY KEY ("pengerjaanId","soalId")
);

-- CreateTable
CREATE TABLE "BobotNilai" (
    "kelasId" INTEGER NOT NULL,
    "pelajaranId" INTEGER NOT NULL,
    "semester" "Semester" NOT NULL,
    "tugas" INTEGER NOT NULL,
    "kuis" INTEGER NOT NULL,
    "ujian" INTEGER NOT NULL,

    CONSTRAINT "BobotNilai_pkey" PRIMARY KEY ("kelasId","pelajaranId","semester")
);

-- CreateIndex
CREATE UNIQUE INDEX "Berkas_kunci_key" ON "Berkas"("kunci");

-- CreateIndex
CREATE UNIQUE INDEX "BahanAjar_pelajaranId_tingkat_urutan_key" ON "BahanAjar"("pelajaranId", "tingkat", "urutan");

-- CreateIndex
CREATE INDEX "Materi_bahanAjarId_idx" ON "Materi"("bahanAjarId");

-- CreateIndex
CREATE INDEX "Materi_pertemuanId_idx" ON "Materi"("pertemuanId");

-- CreateIndex
CREATE UNIQUE INDEX "Asesmen_jadwalUjianId_key" ON "Asesmen"("jadwalUjianId");

-- CreateIndex
CREATE INDEX "Asesmen_kelasId_pelajaranId_idx" ON "Asesmen"("kelasId", "pelajaranId");

-- CreateIndex
CREATE INDEX "Soal_pelajaranId_tingkat_idx" ON "Soal"("pelajaranId", "tingkat");

-- CreateIndex
CREATE UNIQUE INDEX "Pengerjaan_asesmenId_siswaId_key" ON "Pengerjaan"("asesmenId", "siswaId");

-- CreateIndex
CREATE INDEX "Pertemuan_kelasId_pelajaranId_idx" ON "Pertemuan"("kelasId", "pelajaranId");

-- AddForeignKey
ALTER TABLE "Pertemuan" ADD CONSTRAINT "Pertemuan_pelajaranId_fkey" FOREIGN KEY ("pelajaranId") REFERENCES "Pelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pertemuan" ADD CONSTRAINT "Pertemuan_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Berkas" ADD CONSTRAINT "Berkas_pengunggahId_fkey" FOREIGN KEY ("pengunggahId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BahanAjar" ADD CONSTRAINT "BahanAjar_pelajaranId_fkey" FOREIGN KEY ("pelajaranId") REFERENCES "Pelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materi" ADD CONSTRAINT "Materi_berkasId_fkey" FOREIGN KEY ("berkasId") REFERENCES "Berkas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materi" ADD CONSTRAINT "Materi_bahanAjarId_fkey" FOREIGN KEY ("bahanAjarId") REFERENCES "BahanAjar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materi" ADD CONSTRAINT "Materi_pertemuanId_fkey" FOREIGN KEY ("pertemuanId") REFERENCES "Pertemuan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asesmen" ADD CONSTRAINT "Asesmen_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asesmen" ADD CONSTRAINT "Asesmen_pelajaranId_fkey" FOREIGN KEY ("pelajaranId") REFERENCES "Pelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asesmen" ADD CONSTRAINT "Asesmen_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asesmen" ADD CONSTRAINT "Asesmen_pertemuanId_fkey" FOREIGN KEY ("pertemuanId") REFERENCES "Pertemuan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asesmen" ADD CONSTRAINT "Asesmen_jadwalUjianId_fkey" FOREIGN KEY ("jadwalUjianId") REFERENCES "JadwalUjian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asesmen" ADD CONSTRAINT "Asesmen_lampiranId_fkey" FOREIGN KEY ("lampiranId") REFERENCES "Berkas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Soal" ADD CONSTRAINT "Soal_pelajaranId_fkey" FOREIGN KEY ("pelajaranId") REFERENCES "Pelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Soal" ADD CONSTRAINT "Soal_pembuatId_fkey" FOREIGN KEY ("pembuatId") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsesmenSoal" ADD CONSTRAINT "AsesmenSoal_asesmenId_fkey" FOREIGN KEY ("asesmenId") REFERENCES "Asesmen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsesmenSoal" ADD CONSTRAINT "AsesmenSoal_soalId_fkey" FOREIGN KEY ("soalId") REFERENCES "Soal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengerjaan" ADD CONSTRAINT "Pengerjaan_asesmenId_fkey" FOREIGN KEY ("asesmenId") REFERENCES "Asesmen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengerjaan" ADD CONSTRAINT "Pengerjaan_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengerjaan" ADD CONSTRAINT "Pengerjaan_berkasId_fkey" FOREIGN KEY ("berkasId") REFERENCES "Berkas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jawaban" ADD CONSTRAINT "Jawaban_pengerjaanId_fkey" FOREIGN KEY ("pengerjaanId") REFERENCES "Pengerjaan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jawaban" ADD CONSTRAINT "Jawaban_soalId_fkey" FOREIGN KEY ("soalId") REFERENCES "Soal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BobotNilai" ADD CONSTRAINT "BobotNilai_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BobotNilai" ADD CONSTRAINT "BobotNilai_pelajaranId_fkey" FOREIGN KEY ("pelajaranId") REFERENCES "Pelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

