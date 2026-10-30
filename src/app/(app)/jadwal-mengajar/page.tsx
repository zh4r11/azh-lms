import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { PENILAI } from "@/lib/access";
import { EmptyState, PageHeader } from "@/components/page";
import { WeekGrid } from "@/components/week-grid";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Jadwal mengajar" };

export default async function JadwalMengajar({ searchParams }: PageProps<"/jadwal-mengajar">) {
  const user = await requireRole(PENILAI);
  // A teacher linked to their guru record lands on their own timetable.
  const guruId = Number((await searchParams).guru) || user.guruId || undefined;

  const guru = await prisma.guru.findMany({
    orderBy: { nama: "asc" },
    select: { id: true, nama: true },
  });
  const terpilih = guruId ? guru.find((g) => g.id === guruId) : undefined;
  const jadwal = terpilih
    ? await prisma.jadwal.findMany({
        where: { guruId: terpilih.id },
        include: { pelajaran: true, kelas: true },
      })
    : [];

  return (
    <>
      <PageHeader
        title={terpilih ? `Jadwal mengajar ${terpilih.nama}` : "Jadwal mengajar"}
        mark={terpilih ? terpilih.nama : "mengajar"}
        description="Semua kelas yang diajar seorang guru dalam satu minggu."
      />

      {guru.length === 0 ? (
        <EmptyState title="Belum ada data guru">
          Admin perlu memasukkan data guru dan menyusun jadwal kelas lebih dulu.
        </EmptyState>
      ) : (
        <>
          <form action="/jadwal-mengajar" className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid gap-1.5 sm:w-80">
              <Label htmlFor="guru">Guru</Label>
              <NativeSelect id="guru" name="guru" defaultValue={terpilih?.id ?? ""} required>
                <option value="" disabled>
                  Pilih guru
                </option>
                {guru.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit" variant="secondary">
              Tampilkan jadwal
            </Button>
          </form>

          {!terpilih ? (
            <p className="text-muted-foreground">Pilih guru untuk menampilkan jadwalnya.</p>
          ) : jadwal.length === 0 ? (
            <EmptyState title={`${terpilih.nama} belum punya jam mengajar`}>
              Jadwal dibuat per kelas di menu Jadwal pelajaran, dengan memilih guru ini sebagai
              pengajar.
            </EmptyState>
          ) : (
            <WeekGrid
              emptyDay="Tidak mengajar"
              slots={jadwal.map((j) => ({
                id: j.id,
                hari: j.hari,
                jamMulai: j.jamMulai,
                jamSelesai: j.jamSelesai,
                judul: j.kelas.nama,
                keterangan: j.pelajaran.nama,
              }))}
            />
          )}
        </>
      )}
    </>
  );
}
