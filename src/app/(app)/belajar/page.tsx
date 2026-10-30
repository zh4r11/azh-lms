import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { alasanKosong, daftarKursus } from "@/lib/lingkup";
import { EmptyState, PageHeader } from "@/components/page";

export const metadata: Metadata = { title: "Kelas belajar" };

export default async function BelajarIndex() {
  const user = await requireRole();
  const kursus = await daftarKursus(user);
  const now = new Date();

  const [kelas, pelajaran, terbuka, pengajar] = await Promise.all([
    prisma.kelas.findMany({ where: { id: { in: kursus.map((k) => k.kelasId) } }, orderBy: { nama: "asc" } }),
    prisma.pelajaran.findMany({ where: { id: { in: kursus.map((k) => k.pelajaranId) } } }),
    // Work that is open right now, so each row can say what needs attention.
    prisma.asesmen.findMany({
      where: {
        terbit: true,
        dibuka: { lte: now },
        ditutup: { gte: now },
        OR: kursus.map((k) => ({ kelasId: k.kelasId, pelajaranId: k.pelajaranId })),
        ...(user.role === "SISWA" && user.siswaId
          ? { pengerjaan: { none: { siswaId: user.siswaId, dikumpulkan: { not: null } } } }
          : {}),
      },
      select: { kelasId: true, pelajaranId: true },
    }),
    prisma.jadwal.findMany({
      where: { OR: kursus.map((k) => ({ kelasId: k.kelasId, pelajaranId: k.pelajaranId })), guruId: { not: null } },
      distinct: ["kelasId", "pelajaranId"],
      select: { kelasId: true, pelajaranId: true, guru: { select: { nama: true } } },
    }),
  ]);
  const namaPelajaran = new Map(pelajaran.map((p) => [p.id, p.nama]));
  const guruDari = new Map(pengajar.map((j) => [`${j.kelasId}:${j.pelajaranId}`, j.guru?.nama]));
  const jumlahTerbuka = (k: { kelasId: number; pelajaranId: number }) =>
    terbuka.filter((a) => a.kelasId === k.kelasId && a.pelajaranId === k.pelajaranId).length;

  return (
    <>
      <PageHeader
        title="Kelas belajar"
        mark="belajar"
        description={
          user.role === "SISWA"
            ? "Materi tiap pertemuan, absen online, tugas, kuis, dan nilai untuk setiap mata pelajaran Anda."
            : "Setiap mata pelajaran di setiap kelas punya pertemuan, materi, tugas, kuis, dan rekap nilainya sendiri."
        }
      />
      {kursus.length === 0 ? (
        <EmptyState title="Belum ada kelas belajar">
          {alasanKosong(user, "ujian") ??
            "Kelas belajar muncul dari jadwal pelajaran. Susun jadwal di menu Jadwal pelajaran lebih dulu."}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-10">
          {kelas.map((kl) => {
            const baris = kursus
              .filter((k) => k.kelasId === kl.id)
              .sort((a, b) => namaPelajaran.get(a.pelajaranId)!.localeCompare(namaPelajaran.get(b.pelajaranId)!));
            return (
              <section key={kl.id} aria-labelledby={`kelas-${kl.id}`}>
                <h2 id={`kelas-${kl.id}`} className="rule-double mb-3 text-xl font-semibold">
                  Kelas {kl.nama}
                </h2>
                <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                  {baris.map((k) => {
                    const n = jumlahTerbuka(k);
                    return (
                      <li key={k.pelajaranId} className="border-b">
                        <Link
                          href={`/belajar/${k.kelasId}/${k.pelajaranId}`}
                          className="group flex min-h-14 items-center justify-between gap-4 rounded-md px-2 py-3 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <span className="min-w-0">
                            <span className="block font-heading text-lg font-semibold group-hover:underline">
                              {namaPelajaran.get(k.pelajaranId)}
                            </span>
                            <span className="block truncate text-sm text-muted-foreground">
                              {guruDari.get(`${k.kelasId}:${k.pelajaranId}`) ?? "Guru belum ditentukan"}
                              {user.role !== "SISWA" && !k.kelola ? " · hanya lihat" : ""}
                            </span>
                          </span>
                          {n ? (
                            <span className="shrink-0 rounded-sm bg-highlight px-2 py-0.5 text-sm font-semibold text-foreground">
                              {n} {user.role === "SISWA" ? "belum dikerjakan" : "sedang dibuka"}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
