-- AlterTable
ALTER TABLE "User" ADD COLUMN     "guruId" INTEGER,
ADD COLUMN     "siswaId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_siswaId_key" ON "User"("siswaId");

-- CreateIndex
CREATE UNIQUE INDEX "User_guruId_key" ON "User"("guruId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

