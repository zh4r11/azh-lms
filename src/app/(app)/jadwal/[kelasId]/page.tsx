import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { LIHAT_JADWAL } from "@/lib/access";
import { kelasUntuk } from "@/lib/lingkup";
import { PageHeader } from "@/components/page";
import { ConfirmDelete } from "@/components/forms";
import { WeekGrid } from "@/components/week-grid";
import { HARI_LABEL } from "@/lib/labels";
import { createJadwal, deleteJadwal, updateJadwal } from "../actions";
import { JadwalDialog } from "../jadwal-form";

export const metadata: Metadata = { title: "Jadwal kelas" };

export default async function JadwalKelas({ params }: PageProps<"/jadwal/[kelasId]">) {
  const user = await requireRole(LIHAT_JADWAL);
  const isAdmin = user.role === "ADMIN";
  const kelasId = Number((await params).kelasId);
  if (!Number.isInteger(kelasId)) notFound();
  const ids = await kelasUntuk(user, "jadwal");
  if (ids && !ids.includes(kelasId)) notFound();

  const [kelas, pelajaran, guru] = await Promise.all([
    prisma.kelas.findUnique({
      where: { id: kelasId },
      include: { jadwal: { include: { pelajaran: true, guru: true } }, waliKelas: true },
    }),
    isAdmin ? prisma.pelajaran.findMany({ orderBy: { nama: "asc" } }) : [],
    isAdmin ? prisma.guru.findMany({ orderBy: { nama: "asc" } }) : [],
  ]);
  if (!kelas) notFound();

  const opsiPelajaran = pelajaran.map((p) => ({ value: String(p.id), label: p.nama }));
  const opsiGuru = guru.map((g) => ({
    value: String(g.id),
    label: g.nama,
    pelajaranId: g.pelajaranId,
  }));

  return (
    <>
      <PageHeader
        title={`Jadwal kelas ${kelas.nama}`}
        mark={kelas.nama}
        back={ids?.length === 1 ? undefined : { href: "/jadwal", label: ids ? "Kelas lain" : "Semua kelas" }}
        description={`Wali kelas: ${kelas.waliKelas?.nama ?? "belum ditentukan"}`}
        actions={
          isAdmin ? (
            <JadwalDialog
              action={createJadwal.bind(null, kelas.id)}
              pelajaran={opsiPelajaran}
              guru={opsiGuru}
            />
          ) : null
        }
      />
      {isAdmin && pelajaran.length === 0 ? (
        <p className="mb-6 rounded-md border bg-card p-4">
          Belum ada mata pelajaran. Tambahkan dulu di menu Mata pelajaran agar bisa menyusun jadwal.
        </p>
      ) : null}
      <WeekGrid
        emptyDay={isAdmin ? "Belum ada slot. Tambahkan dengan tombol di atas." : "Tidak ada pelajaran"}
        slots={kelas.jadwal.map((j) => ({
          id: j.id,
          hari: j.hari,
          jamMulai: j.jamMulai,
          jamSelesai: j.jamSelesai,
          judul: j.pelajaran.nama,
          keterangan: j.guru?.nama ?? "Guru belum ditentukan",
          aksi: isAdmin ? (
            <>
              <JadwalDialog
                action={updateJadwal.bind(null, j.id, kelas.id)}
                pelajaran={opsiPelajaran}
                guru={opsiGuru}
                initial={j}
              />
              <ConfirmDelete
                action={deleteJadwal.bind(null, j.id)}
                title="Hapus slot jadwal ini?"
                description={`${j.pelajaran.nama}, ${HARI_LABEL[j.hari]} ${j.jamMulai} sampai ${j.jamSelesai}.`}
              />
            </>
          ) : undefined,
        }))}
      />
    </>
  );
}
