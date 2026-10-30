import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAF } from "@/lib/access";
import { JK_LABEL, formatTanggal } from "@/lib/labels";
import { EmptyState, PageHeader, TableBox } from "@/components/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Siswa per kelas" };

export default async function DetailKelas({ params }: PageProps<"/kelas/[id]">) {
  const user = await requireRole(STAF);
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const kelas = await prisma.kelas.findUnique({
    where: { id },
    include: { waliKelas: true, siswa: { orderBy: { nama: "asc" } } },
  });
  if (!kelas) notFound();

  return (
    <>
      <PageHeader
        title={`Siswa kelas ${kelas.nama}`}
        mark={kelas.nama}
        back={user.role === "ADMIN" ? { href: "/kelas", label: "Daftar kelas" } : undefined}
        description={
          <>
            Wali kelas: {kelas.waliKelas?.nama ?? "belum ditentukan"} · {kelas.siswa.length} siswa
          </>
        }
      />
      {kelas.siswa.length === 0 ? (
        <EmptyState title="Belum ada siswa di kelas ini">
          Admin dapat memasukkan siswa ke kelas ini lewat halaman Data siswa.
        </EmptyState>
      ) : (
        <TableBox>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-right">No</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>No. induk</TableHead>
                <TableHead>Jenis kelamin</TableHead>
                <TableHead>Tempat, tanggal lahir</TableHead>
                <TableHead>Telepon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kelas.siswa.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="tabular text-right text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-semibold">{s.nama}</TableCell>
                  <TableCell className="tabular">{s.noInduk}</TableCell>
                  <TableCell>{JK_LABEL[s.jk]}</TableCell>
                  <TableCell>
                    {s.tempatLahir}, {formatTanggal(s.tanggalLahir)}
                  </TableCell>
                  <TableCell className="tabular">{s.telp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableBox>
      )}
    </>
  );
}
