-- Exams are now per class; old school-wide rows cannot be mapped to a class, so they are removed.
DELETE FROM "JadwalUjian";

-- CreateEnum
CREATE TYPE "JenisUjian" AS ENUM ('UTS', 'UAS', 'UJIAN_SEKOLAH');

-- AlterTable
ALTER TABLE "JadwalUjian" ADD COLUMN     "jenis" "JenisUjian" NOT NULL,
ADD COLUMN     "kelasId" INTEGER NOT NULL,
ADD COLUMN     "pengawasId" INTEGER,
ADD COLUMN     "ruang" TEXT NOT NULL,
ADD COLUMN     "semester" "Semester" NOT NULL;

-- CreateIndex
CREATE INDEX "JadwalUjian_tanggal_idx" ON "JadwalUjian"("tanggal");

-- CreateIndex
CREATE INDEX "JadwalUjian_kelasId_idx" ON "JadwalUjian"("kelasId");

-- CreateIndex
CREATE INDEX "JadwalUjian_pengawasId_idx" ON "JadwalUjian"("pengawasId");

-- AddForeignKey
ALTER TABLE "JadwalUjian" ADD CONSTRAINT "JadwalUjian_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalUjian" ADD CONSTRAINT "JadwalUjian_pengawasId_fkey" FOREIGN KEY ("pengawasId") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

