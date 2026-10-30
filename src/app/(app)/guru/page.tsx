import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { STAF } from "@/lib/access";
import { JK_LABEL } from "@/lib/labels";
import { EmptyState, PageHeader, TableBox } from "@/components/page";
import { SearchForm } from "@/components/search-form";
import { ConfirmDelete } from "@/components/forms";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createGuru, deleteGuru, updateGuru } from "./actions";
import { GuruDialog } from "./guru-form";

export const metadata: Metadata = { title: "Data guru" };

export default async function GuruPage({ searchParams }: PageProps<"/guru">) {
  const user = await requireRole(STAF);
  const isAdmin = user.role === "ADMIN";
  const q = String((await searchParams).q ?? "").trim();

  const [guru, pelajaran] = await Promise.all([
    prisma.guru.findMany({
      where: q
        ? { OR: [{ nama: { contains: q, mode: "insensitive" } }, { noInduk: { contains: q } }] }
        : undefined,
      include: { pelajaran: true, kelasWali: { select: { nama: true } } },
      orderBy: { nama: "asc" },
    }),
    prisma.pelajaran.findMany({ orderBy: { nama: "asc" } }),
  ]);
  const opsiPelajaran = pelajaran.map((p) => ({ value: String(p.id), label: p.nama }));

  return (
    <>
      <PageHeader
        title="Data guru"
        mark="guru"
        description="Guru pengampu, mata pelajaran, dan kelas yang diwalikan."
        actions={isAdmin ? <GuruDialog action={createGuru} pelajaran={opsiPelajaran} /> : null}
      />
      <SearchForm
        action="/guru"
        label="Cari guru"
        placeholder="Nama atau NIP"
        defaultValue={q}
      />

      {guru.length === 0 ? (
        q ? (
          <EmptyState title={`Tidak ada guru yang cocok dengan “${q}”`}>
            Periksa ejaan nama atau NIP, atau hapus pencarian untuk melihat semua guru.
          </EmptyState>
        ) : (
          <EmptyState title="Belum ada data guru">
            {isAdmin ? (
              <>
                Tambahkan guru agar bisa dipakai di jadwal dan sebagai wali kelas.
                {pelajaran.length === 0 ? (
                  <>
                    {" "}Buat <Link className="underline" href="/pelajaran">mata pelajaran</Link> lebih
                    dulu.
                  </>
                ) : null}
              </>
            ) : (
              "Admin sekolah belum memasukkan data guru."
            )}
          </EmptyState>
        )
      ) : (
        <TableBox>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Mata pelajaran</TableHead>
                <TableHead>Wali kelas</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead>Telepon</TableHead>
                {isAdmin ? <TableHead className="w-0" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {guru.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    <span className="font-semibold">{g.nama}</span>
                    <span className="block text-sm text-muted-foreground">{JK_LABEL[g.jk]}</span>
                  </TableCell>
                  <TableCell>{g.pelajaran?.nama ?? <span className="text-muted-foreground">Belum diatur</span>}</TableCell>
                  <TableCell>
                    {g.kelasWali.length ? g.kelasWali.map((k) => k.nama).join(", ") : "–"}
                  </TableCell>
                  <TableCell className="tabular">{g.noInduk ?? "–"}</TableCell>
                  <TableCell className="tabular">{g.telp}</TableCell>
                  {isAdmin ? (
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <GuruDialog
                          action={updateGuru.bind(null, g.id)}
                          pelajaran={opsiPelajaran}
                          initial={g}
                        />
                        <ConfirmDelete
                          action={deleteGuru.bind(null, g.id)}
                          title={`Hapus ${g.nama}?`}
                          description="Slot jadwal yang diajar guru ini menjadi tanpa pengajar, dan kelas yang diwalikannya menjadi tanpa wali kelas."
                        />
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableBox>
      )}
    </>
  );
}
