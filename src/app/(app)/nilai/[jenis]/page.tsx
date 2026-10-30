import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { PENILAI } from "@/lib/access";
import { alasanKosong, kelasUntuk } from "@/lib/lingkup";
import { PageHeader } from "@/components/page";
import { KelasList } from "@/components/kelas-list";
import { JENIS_NILAI, isJenis } from "../jenis";

export async function generateMetadata({ params }: PageProps<"/nilai/[jenis]">): Promise<Metadata> {
  const { jenis } = await params;
  return { title: isJenis(jenis) ? JENIS_NILAI[jenis].judul : "Nilai" };
}

export default async function NilaiIndex({ params }: PageProps<"/nilai/[jenis]">) {
  const user = await requireRole(PENILAI);
  const { jenis } = await params;
  if (!isJenis(jenis)) notFound();
  const cfg = JENIS_NILAI[jenis];
  if (!cfg.roles.includes(user.role)) redirect("/");
  const ids = await kelasUntuk(user, cfg.fitur);
  if (ids?.length === 1) redirect(`/nilai/${jenis}/${ids[0]}`);

  const kelas = await prisma.kelas.findMany({
    where: ids ? { id: { in: ids } } : undefined,
    orderBy: { nama: "asc" },
    include: { waliKelas: { select: { nama: true } }, _count: { select: { siswa: true } } },
  });

  return (
    <>
      <PageHeader
        title={cfg.judul}
        mark={cfg.mark}
        description={`${cfg.deskripsi} Pilih kelas untuk mulai mengisi.`}
      />
      <KelasList
        kelas={kelas.map((k) => ({
          id: k.id,
          nama: k.nama,
          info: `${k._count.siswa} siswa${k.waliKelas ? ` · ${k.waliKelas.nama}` : ""}`,
        }))}
        hrefFor={(id) => `/nilai/${jenis}/${id}`}
        emptyHint={alasanKosong(user, cfg.fitur) ?? "Admin perlu membuat kelas dan memasukkan siswa lebih dulu."}
      />
    </>
  );
}
