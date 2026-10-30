import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JENIS_ASESMEN_LABEL, SEMESTER_LABEL, formatNilai, parseSemester } from "@/lib/labels";
import { EmptyState, SectionTitle, TableBox } from "@/components/page";
import { SemesterSwitch } from "@/components/semester-switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hitungKeRapor } from "@/app/(app)/asesmen/actions";
import { muatKursus } from "../../../kursus";
import { BobotRaporForm } from "./bobot-form";

export const metadata: Metadata = { title: "Rekap nilai" };

const JENIS = ["TUGAS", "KUIS", "UJIAN"] as const;
const bulat = (n: number) => Math.round(n * 10) / 10;
const fmt = (n: number | null) => (n === null ? "–" : formatNilai(n));

export default async function RekapNilai({ params, searchParams }: PageProps<"/belajar/[kelasId]/[pelajaranId]/nilai">) {
  const p = await params;
  const k = await muatKursus(p.kelasId, p.pelajaranId);
  const semester = parseSemester((await searchParams).semester);
  const siswaSaja = k.user.role === "SISWA";
  const now = new Date();

  const [asesmen, siswa, rapor, bobot] = await Promise.all([
    prisma.asesmen.findMany({
      where: { kelasId: k.kelas.id, pelajaranId: k.pelajaran.id, semester, terbit: true },
      orderBy: { ditutup: "asc" },
      include: {
        pengerjaan: {
          where: siswaSaja ? { siswaId: k.user.siswaId ?? -1 } : {},
          select: { siswaId: true, nilai: true, dikumpulkan: true },
        },
      },
    }),
    prisma.siswa.findMany({
      where: siswaSaja ? { id: k.user.siswaId ?? -1 } : { kelasId: k.kelas.id },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
    prisma.nilai.findMany({
      where: { pelajaranId: k.pelajaran.id, semester, siswa: { kelasId: k.kelas.id } },
      select: { siswaId: true, nilai: true, predikat: true },
    }),
    prisma.bobotNilai.findUnique({
      where: { kelasId_pelajaranId_semester: { kelasId: k.kelas.id, pelajaranId: k.pelajaran.id, semester } },
    }),
  ]);
  const nilaiRapor = new Map(rapor.map((r) => [r.siswaId, r]));
  // A student who missed closed work gets 0 for it; open work is not counted yet.
  const nilaiDari = (a: (typeof asesmen)[number], siswaId: number) => {
    const pj = a.pengerjaan.find((x) => x.siswaId === siswaId);
    if (pj?.nilai !== null && pj?.nilai !== undefined) return pj.nilai;
    return a.ditutup < now ? (pj?.dikumpulkan ? null : 0) : null;
  };
  const rata = (siswaId: number, jenis: (typeof JENIS)[number]) => {
    const xs = asesmen.filter((a) => a.jenis === jenis).map((a) => nilaiDari(a, siswaId)).filter((n): n is number => n !== null);
    return xs.length ? bulat(xs.reduce((s, n) => s + n, 0) / xs.length) : null;
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          {siswaSaja
            ? "Nilai tugas, kuis, dan ujian online Anda. Yang tidak dikumpulkan sampai batas waktu bernilai 0."
            : "Nilai yang tidak dikumpulkan sampai batas waktu dihitung 0. Tugas yang masih dibuka belum ikut dihitung."}
        </p>
        <SemesterSwitch basePath={`${k.base}/nilai`} current={semester} />
      </div>

      {asesmen.length === 0 ? (
        <EmptyState title={`Belum ada nilai di ${SEMESTER_LABEL[semester].toLowerCase()}`}>
          Nilai muncul di sini setelah ada tugas, kuis, atau ujian online yang diterbitkan.
        </EmptyState>
      ) : siswaSaja ? (
        <>
          <dl className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {JENIS.map((j) => (
              <div key={j} className="rounded-lg border bg-card p-4">
                <dt className="text-sm text-muted-foreground">Rata-rata {JENIS_ASESMEN_LABEL[j].toLowerCase()}</dt>
                <dd className="tabular text-2xl font-semibold">{fmt(rata(siswa[0]?.id ?? -1, j))}</dd>
              </div>
            ))}
          </dl>
          <TableBox>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead className="text-right">Nilai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asesmen.map((a) => {
                  const n = nilaiDari(a, siswa[0]?.id ?? -1);
                  const tampil = a.tampilkanHasil || a.ditutup < now;
                  return (
                    <TableRow key={a.id}>
                      <TableCell>{JENIS_ASESMEN_LABEL[a.jenis]}</TableCell>
                      <TableCell>
                        <Link href={`/asesmen/${a.id}`} className="underline-offset-4 hover:underline">
                          {a.judul}
                        </Link>
                      </TableCell>
                      <TableCell className="tabular text-right">{n !== null && tampil ? formatNilai(n) : a.ditutup >= now ? "Masih dibuka" : "Menunggu dinilai"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableBox>
        </>
      ) : (
        <div className="flex flex-col gap-10">
          <TableBox>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">Siswa</TableHead>
                  {asesmen.map((a) => (
                    <TableHead key={a.id} className="text-right">
                      <Link href={`/asesmen/${a.id}`} className="block max-w-32 truncate underline-offset-4 hover:underline" title={a.judul}>
                        <span className="block text-xs font-normal text-muted-foreground">{JENIS_ASESMEN_LABEL[a.jenis]}</span>
                        {a.judul}
                      </Link>
                    </TableHead>
                  ))}
                  {JENIS.map((j) => (
                    <TableHead key={j} className="text-right">
                      Rata {JENIS_ASESMEN_LABEL[j].toLowerCase()}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Rapor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {siswa.map((s) => {
                  const r = nilaiRapor.get(s.id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="sticky left-0 bg-card font-semibold">{s.nama}</TableCell>
                      {asesmen.map((a) => {
                        const n = nilaiDari(a, s.id);
                        return (
                          <TableCell key={a.id} className="tabular text-right">
                            {n !== null ? formatNilai(n) : <span className="text-muted-foreground">{a.ditutup >= now ? "·" : "?"}</span>}
                          </TableCell>
                        );
                      })}
                      {JENIS.map((j) => (
                        <TableCell key={j} className="tabular text-right">
                          {fmt(rata(s.id, j))}
                        </TableCell>
                      ))}
                      <TableCell className="tabular text-right font-semibold">{r ? `${r.nilai} (${r.predikat})` : "–"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableBox>
          <p className="-mt-6 text-sm text-muted-foreground">
            Titik: masih dibuka. Tanda tanya: sudah dikumpulkan tapi belum dinilai.
          </p>

          {k.kelola ? (
            <section aria-labelledby="h-bobot" className="max-w-2xl">
              <SectionTitle>
                <span id="h-bobot">Hitung ke nilai rapor</span>
              </SectionTitle>
              <p className="mb-4 text-pretty">
                Nilai rapor setiap siswa = rata-rata tugas, kuis, dan ujian yang sudah ditutup, dikali bobot. Jika salah satu jenis
                belum ada, bobotnya dibagi ke jenis lain. Deskripsi rapor yang sudah Anda tulis tidak diubah.
              </p>
              <BobotRaporForm
                action={hitungKeRapor.bind(null, k.kelas.id, k.pelajaran.id)}
                semester={semester}
                awal={bobot ?? { tugas: 30, kuis: 20, ujian: 50 }}
              />
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
