import type { Metadata } from "next";
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
import { createPelajaran, deletePelajaran, updatePelajaran } from "./actions";
import { PelajaranDialog } from "./pelajaran-form";

export const metadata: Metadata = { title: "Mata pelajaran" };

export default async function PelajaranPage() {
  await requireRole(ADMIN);
  const pelajaran = await prisma.pelajaran.findMany({
    orderBy: { nama: "asc" },
    include: { _count: { select: { guru: true, jadwal: true } } },
  });

  return (
    <>
      <PageHeader
        title="Mata pelajaran"
        mark="pelajaran"
        description="Daftar mata pelajaran dipakai di jadwal, data guru, ujian, dan rapor."
        actions={<PelajaranDialog action={createPelajaran} />}
      />
      {pelajaran.length === 0 ? (
        <EmptyState title="Belum ada mata pelajaran">
          Tambahkan mata pelajaran dulu. Jadwal, data guru, dan nilai ujian membutuhkannya.
        </EmptyState>
      ) : (
        <TableBox>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mata pelajaran</TableHead>
                <TableHead className="text-right">Jam / minggu</TableHead>
                <TableHead className="text-right">Guru pengampu</TableHead>
                <TableHead className="text-right">Slot jadwal</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pelajaran.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold">{p.nama}</TableCell>
                  <TableCell className="tabular text-right">{p.jumlahJam}</TableCell>
                  <TableCell className="tabular text-right">{p._count.guru}</TableCell>
                  <TableCell className="tabular text-right">{p._count.jadwal}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <PelajaranDialog
                        action={updatePelajaran.bind(null, p.id)}
                        initial={{ nama: p.nama, jumlahJam: p.jumlahJam }}
                      />
                      <ConfirmDelete
                        action={deletePelajaran.bind(null, p.id)}
                        title={`Hapus ${p.nama}?`}
                        description={`${p._count.jadwal} slot jadwal, jadwal ujian, dan nilai untuk mata pelajaran ini ikut terhapus. Guru pengampunya tetap ada, hanya kehilangan mata pelajaran.`}
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
