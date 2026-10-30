import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ADMIN } from "@/lib/access";
import { TINGKAT_URUT } from "@/lib/labels";
import { EmptyState, PageHeader } from "@/components/page";
import { ConfirmDelete } from "@/components/forms";
import { MateriList, pilihMateri } from "@/components/materi";
import { MateriDialog } from "@/components/materi-form";
import { hapusMateri, tambahMateriBahanAjar } from "@/app/(app)/belajar/actions";
import { createBahanAjar, deleteBahanAjar, updateBahanAjar } from "../../actions";
import { BahanAjarDialog } from "../../bahan-ajar-form";
import type { Tingkat } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Bahan ajar" };

export default async function BahanAjarDetail({ params }: PageProps<"/bahan-ajar/[pelajaranId]/[tingkat]">) {
  await requireRole(ADMIN);
  const p = await params;
  const tingkat = p.tingkat as Tingkat;
  if (!TINGKAT_URUT.includes(tingkat)) notFound();
  const pelajaran = await prisma.pelajaran.findUnique({ where: { id: Number(p.pelajaranId) } });
  if (!pelajaran) notFound();

  const bahan = await prisma.bahanAjar.findMany({
    where: { pelajaranId: pelajaran.id, tingkat },
    orderBy: { urutan: "asc" },
    include: { materi: { select: pilihMateri, orderBy: { createdAt: "asc" } } },
  });
  const berikut = (bahan.at(-1)?.urutan ?? 0) + 1;

  return (
    <>
      <PageHeader
        title={`${pelajaran.nama} kelas ${tingkat}`}
        mark={pelajaran.nama}
        back={{ href: "/bahan-ajar", label: "Semua bahan ajar" }}
        description="Setiap nomor pertemuan di sini muncul otomatis di pertemuan dengan nomor yang sama di semua kelas tingkat ini."
        actions={<BahanAjarDialog action={createBahanAjar.bind(null, pelajaran.id, tingkat)} initial={{ urutan: berikut }} />}
      />
      {bahan.length === 0 ? (
        <EmptyState title="Belum ada bahan ajar">
          Mulai dari pertemuan ke-1 dengan tombol Tambah pertemuan, lalu unggah dokumen atau video ke dalamnya.
        </EmptyState>
      ) : (
        <ol className="flex flex-col gap-6">
          {bahan.map((b) => (
            <li key={b.id} className="rounded-lg border bg-card p-5">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">
                    <span className="tabular mr-2 text-muted-foreground">Ke-{b.urutan}</span>
                    {b.judul}
                  </h2>
                  {b.deskripsi ? <p className="mt-1 text-pretty text-muted-foreground">{b.deskripsi}</p> : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <MateriDialog action={tambahMateriBahanAjar.bind(null, b.id)} />
                  <BahanAjarDialog
                    action={updateBahanAjar.bind(null, b.id)}
                    initial={{ urutan: b.urutan, judul: b.judul, deskripsi: b.deskripsi }}
                  />
                  <ConfirmDelete
                    action={deleteBahanAjar.bind(null, b.id)}
                    title={`Hapus bahan ajar ke-${b.urutan}?`}
                    description="Semua materinya ikut terhapus. Materi yang diunggah guru sendiri di pertemuan kelas tidak terpengaruh."
                  />
                </div>
              </div>
              <MateriList
                materi={b.materi}
                hapus={(id) => hapusMateri.bind(null, id)}
                kosong="Belum ada materi. Tambahkan dokumen atau video."
              />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
