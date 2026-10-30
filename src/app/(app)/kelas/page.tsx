import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ADMIN } from "@/lib/access";
import { EmptyState, PageHeader, TableBox } from "@/components/page";
import { ConfirmDelete } from "@/components/forms";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createKelas, deleteKelas, updateKelas } from "./actions";
import { KelasDialog } from "./kelas-form";

export const metadata: Metadata = { title: "Kelas" };

export default async function KelasPage() {
  await requireRole(ADMIN);
  const [kelas, guru] = await Promise.all([
    prisma.kelas.findMany({
      orderBy: { nama: "asc" },
      include: { waliKelas: true, _count: { select: { siswa: true, jadwal: true } } },
    }),
    prisma.guru.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
  ]);
  const opsiGuru = guru.map((g) => ({ value: String(g.id), label: g.nama }));

  return (
    <>
      <PageHeader
        title="Daftar kelas"
        mark="kelas"
        description="Kelas menentukan siapa duduk di mana, jadwal pelajarannya, dan wali kelasnya."
        actions={<KelasDialog action={createKelas} guru={opsiGuru} />}
      />
      {kelas.length === 0 ? (
        <EmptyState title="Belum ada kelas">
          Tambahkan kelas sebelum memasukkan data siswa dan jadwal pelajaran.
        </EmptyState>
      ) : (
        <TableBox>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kelas</TableHead>
                <TableHead>Wali kelas</TableHead>
                <TableHead className="text-right">Siswa</TableHead>
                <TableHead className="text-right">Slot jadwal</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {kelas.map((k) => (
                <TableRow key={k.id}>
                  <TableCell>
                    <Link
                      href={`/kelas/${k.id}`}
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {k.nama}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {k.waliKelas?.nama ?? <span className="text-muted-foreground">Belum ditentukan</span>}
                  </TableCell>
                  <TableCell className="tabular text-right">{k._count.siswa}</TableCell>
                  <TableCell className="tabular text-right">{k._count.jadwal}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <KelasDialog
                        action={updateKelas.bind(null, k.id)}
                        guru={opsiGuru}
                        initial={{ nama: k.nama, tingkat: k.tingkat, waliKelasId: k.waliKelasId }}
                      />
                      <ConfirmDelete
                        action={deleteKelas.bind(null, k.id)}
                        title={`Hapus kelas ${k.nama}?`}
                        description={`Jadwal dan data absensi kelas ini ikut terhapus. ${k._count.siswa} siswa tetap tersimpan tetapi menjadi tanpa kelas.`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableBox>
      )}
    </>
  );
}
