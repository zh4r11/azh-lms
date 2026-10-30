import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ADMIN } from "@/lib/access";
import { TINGKAT_URUT } from "@/lib/labels";
import { EmptyState, PageHeader, TableBox } from "@/components/page";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Bahan ajar" };

export default async function BahanAjarIndex() {
  await requireRole(ADMIN);
  const [pelajaran, isi] = await Promise.all([
    prisma.pelajaran.findMany({ orderBy: { nama: "asc" } }),
    prisma.bahanAjar.groupBy({ by: ["pelajaranId", "tingkat"], _count: { _all: true } }),
  ]);
  const jumlah = new Map(isi.map((r) => [`${r.pelajaranId}:${r.tingkat}`, r._count._all]));

  return (
    <>
      <PageHeader
        title="Bahan ajar sekolah"
        mark="Bahan ajar"
        description="Rencana pertemuan bawaan sekolah per mata pelajaran dan tingkat. Saat guru membuat pertemuan ke-N, bahan ajar ke-N langsung tampil untuk kelasnya."
      />
      {pelajaran.length === 0 ? (
        <EmptyState title="Belum ada mata pelajaran">Tambahkan mata pelajaran dulu di menu Mata pelajaran.</EmptyState>
      ) : (
        <TableBox>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mata pelajaran</TableHead>
                {TINGKAT_URUT.map((t) => (
                  <TableHead key={t}>Kelas {t}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pelajaran.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold">{p.nama}</TableCell>
                  {TINGKAT_URUT.map((t) => {
                    const n = jumlah.get(`${p.id}:${t}`) ?? 0;
                    return (
                      <TableCell key={t}>
                        <Link
                          href={`/bahan-ajar/${p.id}/${t}`}
                          className="inline-flex min-h-11 items-center underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8"
                        >
                          {n ? `${n} pertemuan` : <span className="text-muted-foreground">Belum diisi</span>}
                        </Link>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableBox>
      )}
    </>
  );
}
