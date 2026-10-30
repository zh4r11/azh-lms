import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ADMIN } from "@/lib/access";
import { ROLE_LABEL } from "@/lib/labels";
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
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma/enums";
import { createAkun, deleteAkun, updateAkun } from "./actions";
import { AkunDialog } from "./akun-form";

export const metadata: Metadata = { title: "Akun pengguna" };

const FILTERS: { key: string; label: string; roles?: Role[] }[] = [
  { key: "semua", label: "Semua" },
  { key: "staf", label: "Guru dan wali kelas", roles: ["GURU", "WALI_KELAS"] },
  { key: "siswa", label: "Siswa", roles: ["SISWA"] },
  { key: "admin", label: "Admin", roles: ["ADMIN"] },
];

export default async function AkunPage({ searchParams }: PageProps<"/akun">) {
  const me = await requireRole(ADMIN);
  const key = String((await searchParams).peran ?? "semua");
  const filter = FILTERS.find((f) => f.key === key) ?? FILTERS[0];

  const [users, guru] = await Promise.all([
    prisma.user.findMany({
      where: filter.roles ? { role: { in: filter.roles } } : undefined,
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        siswa: { select: { nama: true, noInduk: true } },
        guru: { select: { id: true, nama: true } },
      },
    }),
    prisma.guru.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
  ]);
  const opsiGuru = guru.map((g) => ({ value: String(g.id), label: g.nama }));

  return (
    <>
      <PageHeader
        title="Akun pengguna"
        mark="Akun"
        description="Akun untuk masuk ke LMS. Akun siswa dihubungkan ke nomor induknya, akun guru ke data gurunya."
        actions={<AkunDialog action={createAkun} guru={opsiGuru} />}
      />

      <nav aria-label="Saring peran" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "semua" ? "/akun" : `/akun?peran=${f.key}`}
            aria-current={f.key === filter.key ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-md border px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-9",
              f.key === filter.key
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {users.length === 0 ? (
        <EmptyState title={`Belum ada akun ${filter.label.toLowerCase()}`}>
          Buat akun dengan tombol Buat akun, lalu berikan email dan password kepada pemiliknya.
        </EmptyState>
      ) : (
        <TableBox>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Data terhubung</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold">
                    {u.name}
                    {u.id === me.id ? (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">(Anda)</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{ROLE_LABEL[u.role]}</TableCell>
                  <TableCell>
                    {u.siswa ? (
                      `${u.siswa.nama} (${u.siswa.noInduk})`
                    ) : u.guru ? (
                      u.guru.nama
                    ) : u.role === "SISWA" ? (
                      <span className="font-semibold text-destructive">Belum terhubung</span>
                    ) : (
                      <span className="text-muted-foreground">Tidak ada</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <AkunDialog
                        action={updateAkun.bind(null, u.id)}
                        guru={opsiGuru}
                        initial={{
                          name: u.name,
                          email: u.email,
                          role: u.role,
                          siswaNoInduk: u.siswa?.noInduk,
                          guruId: u.guru ? String(u.guru.id) : undefined,
                        }}
                      />
                      {u.id !== me.id ? (
                        <ConfirmDelete
                          action={deleteAkun.bind(null, u.id)}
                          title={`Hapus akun ${u.email}?`}
                          description="Pemilik akun tidak bisa masuk lagi. Data guru atau siswa yang terkait tidak ikut terhapus."
                        />
                      ) : null}
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
