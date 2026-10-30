import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL, STATUS_URUT, formatHari, formatTanggal } from "@/lib/labels";
import { EmptyState } from "@/components/page";
import { simpanAbsensi } from "@/app/(app)/absensi/actions";
import { RollCall } from "@/app/(app)/absensi/absensi-forms";
import { muatKursus } from "../../../../../kursus";

export const metadata: Metadata = { title: "Isi absensi" };

export default async function IsiAbsensi({ params }: PageProps<"/belajar/[kelasId]/[pelajaranId]/pertemuan/[id]/absensi">) {
  const p = await params;
  const k = await muatKursus(p.kelasId, p.pelajaranId);
  if (!k.kelola) notFound();
  const pt = await prisma.pertemuan.findFirst({
    where: { id: Number(p.id), kelasId: k.kelas.id, pelajaranId: k.pelajaran.id },
    include: { kelas: { include: { siswa: { orderBy: { nama: "asc" } } } }, absensi: true },
  });
  if (!pt) notFound();
  const status = new Map(pt.absensi.map((a) => [a.siswaId, a.status]));

  return (
    <>
      <Link
        href={`${k.base}/pertemuan/${pt.id}`}
        className="mb-2 inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:min-h-0"
      >
        ← {pt.judul}
      </Link>
      <h2 className="mb-1 text-2xl font-semibold">Absensi {pt.judul}</h2>
      <p className="mb-6 text-muted-foreground">
        {formatHari(pt.tanggal)}, {formatTanggal(pt.tanggal)}. Siswa yang sudah absen online tercatat Hadir dan masih bisa diubah.
      </p>
      {pt.kelas.siswa.length === 0 ? (
        <EmptyState title="Kelas ini belum punya siswa">
          Tidak ada yang perlu diabsen. Admin dapat menambahkan siswa di menu Data siswa.
        </EmptyState>
      ) : (
        <RollCall
          action={simpanAbsensi.bind(null, pt.id)}
          statuses={STATUS_URUT.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          siswa={pt.kelas.siswa.map((s) => ({ id: s.id, nama: s.nama, noInduk: s.noInduk, status: status.get(s.id) ?? null }))}
        />
      )}
    </>
  );
}
