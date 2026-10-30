import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { aksesKursus } from "@/lib/lingkup";

/** One tugas, kuis, or ujian, with the viewer's rights. Hidden drafts answer 404 to students. */
export const muatAsesmen = cache(async (rawId: string) => {
  const user = await requireRole();
  const id = Number(rawId);
  if (!Number.isInteger(id)) notFound();
  const a = await prisma.asesmen.findUnique({
    where: { id },
    include: {
      kelas: true,
      pelajaran: true,
      guru: true,
      lampiran: true,
      jadwalUjian: true,
      pertemuan: { select: { id: true, urutan: true, judul: true } },
    },
  });
  if (!a) notFound();
  const akses = await aksesKursus(user, a.kelasId, a.pelajaranId);
  if (!akses || (akses !== "kelola" && !a.terbit)) notFound();
  return { user, a, kelola: akses === "kelola", base: `/belajar/${a.kelasId}/${a.pelajaranId}` };
});
