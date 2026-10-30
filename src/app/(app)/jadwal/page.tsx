import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LIHAT_JADWAL } from "@/lib/access";
import { alasanKosong, kelasUntuk } from "@/lib/lingkup";
import { PageHeader } from "@/components/page";
import { KelasList } from "@/components/kelas-list";

export const metadata: Metadata = { title: "Jadwal pelajaran" };

export default async function JadwalIndex() {
  const user = await requireRole(LIHAT_JADWAL);
  const ids = await kelasUntuk(user, "jadwal");
  // One class (a siswa, or a wali kelas of one class): skip the picker.
  if (ids?.length === 1) redirect(`/jadwal/${ids[0]}`);
  const kelas = await prisma.kelas.findMany({
    where: ids ? { id: { in: ids } } : undefined,
    orderBy: { nama: "asc" },
    include: { _count: { select: { jadwal: true } } },
  });

  return (
    <>
      <PageHeader
        title="Jadwal pelajaran"
        mark="Jadwal"
        description="Pilih kelas untuk melihat jadwal mingguannya."
      />
      <KelasList
        kelas={kelas.map((k) => ({
          id: k.id,
          nama: k.nama,
          info: k._count.jadwal ? `${k._count.jadwal} slot` : "Belum dijadwalkan",
        }))}
        hrefFor={(id) => `/jadwal/${id}`}
        emptyHint={
          alasanKosong(user, "jadwal") ??
          (user.role === "ADMIN"
            ? "Buat kelas di menu Kelas, lalu susun jadwalnya di sini."
            : "Admin sekolah belum membuat kelas.")
        }
      />
    </>
  );
}
