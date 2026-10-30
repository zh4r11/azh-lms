import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { SEMUA } from "@/lib/access";
import { daftarKursus, whereUjian } from "@/lib/lingkup";
import {
  JENIS_UJIAN_URUT,
  formatHari,
  formatTanggal,
  hariIni,
  namaPeriode,
  toDateInput,
} from "@/lib/labels";
import { EmptyState, PageHeader, TableBox } from "@/components/page";
import { ConfirmDelete } from "@/components/forms";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { JenisUjian, Semester } from "@/generated/prisma/enums";
import { createUjian, deleteUjian, updateUjian } from "./actions";
import { SiapkanOnlineDialog, UjianDialog } from "./ujian-form";
import { siapkanUjianOnline } from "@/app/(app)/asesmen/actions";

export const metadata: Metadata = { title: "Jadwal ujian" };

type Periode = { jenis: JenisUjian; semester: Semester };
const kodePeriode = (p: Periode) => `${p.jenis}-${p.semester}`;

function urutPeriode(a: Periode, b: Periode) {
  return (
    a.semester.localeCompare(b.semester) ||
    JENIS_UJIAN_URUT.indexOf(a.jenis) - JENIS_UJIAN_URUT.indexOf(b.jenis)
  );
}

function PeriodeNav({ periode, aktif }: { periode: Periode[]; aktif: Periode }) {
  return (
    <nav aria-label="Pilih periode ujian" className="flex flex-wrap gap-2">
      {periode.map((p) => {
        const on = kodePeriode(p) === kodePeriode(aktif);
        return (
          <Link
            key={kodePeriode(p)}
            href={`/ujian?periode=${kodePeriode(p)}`}
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-md border px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-9",
              on ? "border-primary bg-primary font-semibold text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {namaPeriode(p.jenis, p.semester)}
          </Link>
        );
      })}
    </nav>
  );
}

export default async function UjianPage({ searchParams }: PageProps<"/ujian">) {
  const user = await requireRole(SEMUA);
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;
  const lingkup = await whereUjian(user);
  const today = hariIni();

  const [adaPeriode, terdekat] = await Promise.all([
    prisma.jadwalUjian.findMany({
      where: lingkup,
      distinct: ["jenis", "semester"],
      select: { jenis: true, semester: true },
    }),
    prisma.jadwalUjian.findFirst({
      where: { ...lingkup, tanggal: { gte: today } },
      orderBy: [{ tanggal: "asc" }, { jamMulai: "asc" }],
      select: { jenis: true, semester: true },
    }),
  ]);
  const periode = adaPeriode.sort(urutPeriode);
  // Requested period, else the one with the next exam, else the latest one.
  const aktif =
    periode.find((p) => kodePeriode(p) === sp.periode) ?? terdekat ?? periode[periode.length - 1];

  const [ujian, pelajaran, kelas, guru] = await Promise.all([
    aktif
      ? prisma.jadwalUjian.findMany({
          where: { ...lingkup, jenis: aktif.jenis, semester: aktif.semester },
          include: { pelajaran: true, kelas: true, pengawas: true, asesmen: { select: { id: true, terbit: true, mode: true } } },
          orderBy: [{ tanggal: "asc" }, { jamMulai: "asc" }, { kelas: { nama: "asc" } }],
        })
      : [],
    isAdmin ? prisma.pelajaran.findMany({ orderBy: { nama: "asc" } }) : [],
    isAdmin ? prisma.kelas.findMany({ orderBy: { nama: "asc" } }) : [],
    isAdmin ? prisma.guru.findMany({ orderBy: { nama: "asc" } }) : [],
  ]);
  // Subjects this user teaches, for the "Siapkan online" button.
  const kelola = new Set(
    user.role === "SISWA" ? [] : (await daftarKursus(user)).filter((k) => k.kelola).map((k) => `${k.kelasId}:${k.pelajaranId}`),
  );
  const opsi = {
    pelajaran: pelajaran.map((p) => ({ value: String(p.id), label: p.nama })),
    kelas: kelas.map((k) => ({ value: String(k.id), label: k.nama })),
    guru: guru.map((g) => ({ value: String(g.id), label: g.nama })),
  };

  // Class filter, offered only when this period spans more than one class.
  const kelasPeriode = [...new Map(ujian.map((u) => [u.kelasId, u.kelas.nama])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );
  const kelasDipilih = kelasPeriode.find(([id]) => String(id) === sp.kelas)?.[0];
  const tampil = kelasDipilih ? ujian.filter((u) => u.kelasId === kelasDipilih) : ujian;
  const satuKelas = new Set(tampil.map((u) => u.kelasId)).size <= 1;

  const perTanggal = new Map<string, typeof tampil>();
  for (const u of tampil) {
    const k = toDateInput(u.tanggal);
    perTanggal.set(k, [...(perTanggal.get(k) ?? []), u]);
  }
  const tanpaPengawas = tampil.filter((u) => !u.pengawasId && u.tanggal >= today).length;

  return (
    <>
      <PageHeader
        title="Jadwal ujian"
        mark="ujian"
        description={
          isAdmin
            ? "Satu baris adalah satu kelas yang ujian. Bentrok kelas, ruang, dan pengawas ditolak saat menyimpan."
            : user.role === "SISWA"
              ? "Jadwal ujian kelas Anda, lengkap dengan ruang dan pengawas."
              : "Ujian di kelas yang Anda ajar atau pegang, dan ujian yang Anda awasi."
        }
        actions={
          isAdmin ? (
            <UjianDialog action={createUjian} {...opsi} periode={aktif} />
          ) : null
        }
      />

      {!aktif ? (
        <EmptyState title="Belum ada jadwal ujian">
          {isAdmin
            ? "Jadwalkan ujian dengan tombol Jadwalkan ujian. Pilih jenis, semester, mata pelajaran, lalu centang kelas yang ikut."
            : "Jadwal ujian akan muncul di sini setelah admin menyusunnya."}
        </EmptyState>
      ) : (
        <>
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <PeriodeNav periode={periode} aktif={aktif} />
            {kelasPeriode.length > 1 ? (
              <form action="/ujian" className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <input type="hidden" name="periode" value={kodePeriode(aktif)} />
                <div className="grid gap-1.5 sm:w-56">
                  <Label htmlFor="kelas">Kelas</Label>
                  <NativeSelect id="kelas" name="kelas" defaultValue={kelasDipilih ?? ""}>
                    <option value="">Semua kelas</option>
                    {kelasPeriode.map(([id, nama]) => (
                      <option key={id} value={id}>
                        {nama}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <Button type="submit" variant="secondary">
                  Tampilkan
                </Button>
              </form>
            ) : null}
          </div>

          {isAdmin && tanpaPengawas > 0 ? (
            <p className="mb-6 rounded-md border bg-card p-4">
              {tanpaPengawas} ujian mendatang di daftar ini belum punya pengawas. Atur lewat tombol
              Ubah di barisnya.
            </p>
          ) : null}

          <div className="flex flex-col gap-10">
            {[...perTanggal.entries()].map(([tgl, rows]) => {
              const tanggal = rows[0].tanggal;
              const status =
                tanggal < today ? "Selesai" : tanggal.getTime() === today.getTime() ? "Hari ini" : null;
              return (
                <section key={tgl} aria-labelledby={`tgl-${tgl}`}>
                  <h2 id={`tgl-${tgl}`} className="rule-double mb-4 text-lg font-semibold">
                    {formatHari(tanggal)}, {formatTanggal(tanggal)}
                    {status ? (
                      <span
                        className={cn(
                          "ml-3 text-sm font-normal",
                          status === "Hari ini" ? "highlight-mark font-semibold" : "text-muted-foreground",
                        )}
                      >
                        {status}
                      </span>
                    ) : null}
                  </h2>
                  <TableBox>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jam</TableHead>
                          <TableHead>Mata pelajaran</TableHead>
                          {satuKelas ? null : <TableHead>Kelas</TableHead>}
                          <TableHead>Ruang</TableHead>
                          <TableHead>Pengawas</TableHead>
                          {isAdmin ? <TableHead className="w-0" /> : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((u) => {
                          const saya = user.guruId !== null && u.pengawasId === user.guruId;
                          return (
                            <TableRow key={u.id} className={cn(tanggal < today && "text-muted-foreground")}>
                              <TableCell className="tabular">
                                {u.jamMulai} – {u.jamSelesai}
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold">{u.pelajaran.nama}</span>
                                {u.asesmen && (u.asesmen.terbit || kelola.has(`${u.kelasId}:${u.pelajaranId}`)) ? (
                                  <Link href={`/asesmen/${u.asesmen.id}`} className="block text-sm underline underline-offset-4">
                                    {user.role === "SISWA"
                                      ? u.asesmen.mode === "SOAL"
                                        ? "Kerjakan online"
                                        : "Unggah jawaban online"
                                      : `Online, ${u.asesmen.mode === "SOAL" ? "soal" : "unggah"}${u.asesmen.terbit ? "" : " (draf)"}`}
                                  </Link>
                                ) : !u.asesmen && kelola.has(`${u.kelasId}:${u.pelajaranId}`) && tanggal >= today ? (
                                  <span className="mt-1 block">
                                    <SiapkanOnlineDialog action={siapkanUjianOnline.bind(null, u.id)} />
                                  </span>
                                ) : null}
                              </TableCell>
                              {satuKelas ? null : <TableCell>{u.kelas.nama}</TableCell>}
                              <TableCell>{u.ruang}</TableCell>
                              <TableCell>
                                {saya ? (
                                  <span className="font-semibold">Anda</span>
                                ) : u.pengawas ? (
                                  u.pengawas.nama
                                ) : (
                                  <span className="text-muted-foreground italic">Belum ditentukan</span>
                                )}
                              </TableCell>
                              {isAdmin ? (
                                <TableCell>
                                  <div className="flex justify-end gap-2">
                                    <UjianDialog
                                      action={updateUjian.bind(null, u.id)}
                                      {...opsi}
                                      initial={{
                                        jenis: u.jenis,
                                        semester: u.semester,
                                        tanggal: toDateInput(u.tanggal),
                                        jamMulai: u.jamMulai,
                                        jamSelesai: u.jamSelesai,
                                        pelajaranId: u.pelajaranId,
                                        kelasId: u.kelasId,
                                        ruang: u.ruang,
                                        pengawasId: u.pengawasId,
                                      }}
                                    />
                                    <ConfirmDelete
                                      action={deleteUjian.bind(null, u.id)}
                                      title="Hapus jadwal ujian ini?"
                                      description={`${u.pelajaran.nama} kelas ${u.kelas.nama}, ${formatTanggal(u.tanggal)}.`}
                                    />
                                  </div>
                                </TableCell>
                              ) : null}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableBox>
                </section>
              );
            })}
            {tampil.length === 0 ? (
              <p className="text-muted-foreground">Tidak ada ujian untuk kelas ini di periode ini.</p>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
