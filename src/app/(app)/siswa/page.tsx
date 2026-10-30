import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ADMIN } from "@/lib/access";
import { JK_LABEL, formatTanggal, toDateInput } from "@/lib/labels";
import { EmptyState, PageHeader, TableBox } from "@/components/page";
import { SearchForm } from "@/components/search-form";
import { ConfirmDelete } from "@/components/forms";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createSiswa, deleteSiswa, updateSiswa } from "./actions";
import { SiswaDialog } from "./siswa-form";

export const metadata: Metadata = { title: "Data siswa" };

export default async function SiswaPage({ searchParams }: PageProps<"/siswa">) {
  await requireRole(ADMIN);
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const kelasFilter = Number(sp.kelas) || undefined;

  const [siswa, kelas] = await Promise.all([
    prisma.siswa.findMany({
      where: {
        kelasId: kelasFilter,
        ...(q
          ? { OR: [{ nama: { contains: q, mode: "insensitive" } }, { noInduk: { contains: q } }] }
          : {}),
      },
      include: { kelas: true },
      orderBy: [{ kelas: { nama: "asc" } }, { nama: "asc" }],
    }),
    prisma.kelas.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
  ]);
  const opsiKelas = kelas.map((k) => ({ value: String(k.id), label: k.nama }));
  const filtered = Boolean(q || kelasFilter);

  return (
    <>
      <PageHeader
        title="Data siswa"
        mark="siswa"
        description="Nomor induk di sini dipakai untuk mencari rapor siswa."
        actions={<SiswaDialog action={createSiswa} kelas={opsiKelas} />}
      />
      <SearchForm action="/siswa" label="Cari siswa" placeholder="Nama atau nomor induk" defaultValue={q} active={filtered}>
        <div className="grid gap-1.5 sm:w-48">
          <Label htmlFor="kelas">Kelas</Label>
          <NativeSelect id="kelas" name="kelas" defaultValue={kelasFilter ?? ""}>
            <option value="">Semua kelas</option>
            {kelas.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </NativeSelect>
        </div>
      </SearchForm>

      {siswa.length === 0 ? (
        filtered ? (
          <EmptyState title="Tidak ada siswa yang cocok">
            Ubah kata kunci atau pilih “Semua kelas”.
          </EmptyState>
        ) : (
          <EmptyState title="Belum ada data siswa">
            {kelas.length === 0 ? (
              <>
                Buat <Link className="underline" href="/kelas">kelas</Link> lebih dulu, lalu tambahkan
                siswa ke dalamnya.
              </>
            ) : (
              "Tambahkan siswa satu per satu dengan tombol Tambah siswa."
            )}
          </EmptyState>
        )
      ) : (
        <TableBox>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>No. induk</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Tempat, tanggal lahir</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {siswa.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <span className="font-semibold">{s.nama}</span>
                    <span className="block text-sm text-muted-foreground">{JK_LABEL[s.jk]}</span>
                  </TableCell>
                  <TableCell className="tabular">{s.noInduk}</TableCell>
                  <TableCell>{s.kelas?.nama ?? <span className="text-muted-foreground">Tanpa kelas</span>}</TableCell>
                  <TableCell>
                    {s.tempatLahir}, {formatTanggal(s.tanggalLahir)}
                  </TableCell>
                  <TableCell className="tabular">{s.telp}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <SiswaDialog
                        action={updateSiswa.bind(null, s.id)}
                        kelas={opsiKelas}
                        initial={{
                          noInduk: s.noInduk,
                          nama: s.nama,
                          jk: s.jk,
                          telp: s.telp,
                          kelasId: s.kelasId,
                          alamat: s.alamat,
                          tempatLahir: s.tempatLahir,
                          tanggalLahir: toDateInput(s.tanggalLahir),
                        }}
                      />
                      <ConfirmDelete
                        action={deleteSiswa.bind(null, s.id)}
                        title={`Hapus ${s.nama}?`}
                        description="Absensi, nilai, dan catatan rapor siswa ini ikut terhapus permanen."
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
