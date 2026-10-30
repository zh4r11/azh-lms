import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { aksesKursus } from "@/lib/lingkup";

/**
 * Loads one kursus (subject in a class) for the layout and every tab, once per request, and
 * answers 404 to anyone who may not open it.
 */
export const muatKursus = cache(async (rawKelas: string, rawPelajaran: string) => {
  const user = await requireRole();
  const kelasId = Number(rawKelas);
  const pelajaranId = Number(rawPelajaran);
  if (!Number.isInteger(kelasId) || !Number.isInteger(pelajaranId)) notFound();
  const akses = await aksesKursus(user, kelasId, pelajaranId);
  if (!akses) notFound();

  const [kelas, pelajaran, pengajar] = await Promise.all([
    prisma.kelas.findUniqueOrThrow({ where: { id: kelasId }, include: { waliKelas: true } }),
    prisma.pelajaran.findUniqueOrThrow({ where: { id: pelajaranId } }),
    prisma.jadwal.findMany({
      where: { kelasId, pelajaranId, guruId: { not: null } },
      distinct: ["guruId"],
      select: { guru: { select: { id: true, nama: true } } },
    }),
  ]);
  return {
    user,
    akses,
    kelola: akses === "kelola",
    kelas,
    pelajaran,
    pengajar: pengajar.map((j) => j.guru!),
    base: `/belajar/${kelasId}/${pelajaranId}`,
  };
});
