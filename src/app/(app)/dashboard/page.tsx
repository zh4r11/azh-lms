import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ADMIN } from "@/lib/access";
import { PageHeader, SectionTitle } from "@/components/page";

export const metadata: Metadata = { title: "Ringkasan sekolah" };

export default async function Dashboard() {
  await requireRole(ADMIN);

  const [
    siswa,
    siswaPria,
    guru,
    kelas,
    pelajaran,
    akun,
    kelasTanpaWali,
    kelasTanpaJadwal,
    siswaTanpaKelas,
    guruTanpaMapel,
    slotTanpaGuru,
  ] = await Promise.all([
    prisma.siswa.count(),
    prisma.siswa.count({ where: { jk: "PRIA" } }),
    prisma.guru.count(),
    prisma.kelas.count(),
    prisma.pelajaran.count(),
    prisma.user.count(),
    prisma.kelas.findMany({ where: { waliKelasId: null }, select: { id: true, nama: true }, orderBy: { nama: "asc" } }),
    prisma.kelas.findMany({ where: { jadwal: { none: {} } }, select: { id: true, nama: true }, orderBy: { nama: "asc" } }),
    prisma.siswa.count({ where: { kelasId: null } }),
    prisma.guru.count({ where: { pelajaranId: null } }),
    prisma.jadwal.findMany({
      where: { guruId: null },
      select: { kelasId: true, kelas: { select: { nama: true } } },
      distinct: ["kelasId"],
    }),
  ]);

  const tugas: { judul: string; isi: React.ReactNode; href: string; tautan: string }[] = [];
  if (kelasTanpaWali.length)
    tugas.push({
      judul: `${kelasTanpaWali.length} kelas belum punya wali kelas`,
      isi: kelasTanpaWali.map((k) => k.nama).join(", "),
      href: "/kelas",
      tautan: "Atur wali kelas",
    });
  if (kelasTanpaJadwal.length)
    tugas.push({
      judul: `${kelasTanpaJadwal.length} kelas belum punya jadwal`,
      isi: kelasTanpaJadwal.map((k) => k.nama).join(", "),
      href: `/jadwal/${kelasTanpaJadwal[0].id}`,
      tautan: `Susun jadwal ${kelasTanpaJadwal[0].nama}`,
    });
  if (slotTanpaGuru.length)
    tugas.push({
      judul: "Ada slot jadwal tanpa guru",
      isi: `Di kelas ${slotTanpaGuru.map((s) => s.kelas.nama).join(", ")}.`,
      href: `/jadwal/${slotTanpaGuru[0].kelasId}`,
      tautan: "Tentukan pengajar",
    });
  if (siswaTanpaKelas)
    tugas.push({
      judul: `${siswaTanpaKelas} siswa belum masuk kelas`,
      isi: "Mereka tidak muncul di absensi dan input nilai.",
      href: "/siswa",
      tautan: "Buka data siswa",
    });
  if (guruTanpaMapel)
    tugas.push({
      judul: `${guruTanpaMapel} guru belum punya mata pelajaran`,
      isi: "Mereka tidak tersaring otomatis saat menyusun jadwal.",
      href: "/guru",
      tautan: "Buka data guru",
    });

  const ledger = [
    { label: "Siswa", nilai: siswa, ket: siswa ? `${siswaPria} laki-laki, ${siswa - siswaPria} perempuan` : "Belum ada", href: "/siswa" },
    { label: "Guru", nilai: guru, ket: "Data guru pengajar", href: "/guru" },
    { label: "Kelas", nilai: kelas, ket: "Rombongan belajar", href: "/kelas" },
    { label: "Mata pelajaran", nilai: pelajaran, ket: "Dipakai di jadwal dan rapor", href: "/pelajaran" },
    { label: "Akun", nilai: akun, ket: "Bisa masuk ke LMS", href: "/akun" },
  ];

  return (
    <>
      <PageHeader
        title="Ringkasan sekolah"
        mark="Ringkasan"
        description="Hal yang masih perlu dilengkapi agar jadwal, absensi, dan rapor berjalan."
      />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="h-tugas">
          <SectionTitle>
            <span id="h-tugas">Perlu dilengkapi</span>
          </SectionTitle>
          {tugas.length === 0 ? (
            <p className="text-lg">
              {kelas === 0
                ? "Mulai dengan membuat mata pelajaran dan kelas, lalu masukkan guru dan siswa."
                : "Semua kelas sudah punya wali kelas dan jadwal. Tidak ada yang tertunda."}
            </p>
          ) : (
            <ol className="grid gap-6">
              {tugas.map((t) => (
                <li key={t.judul} className="grid gap-1">
                  <p className="font-heading text-xl font-semibold">{t.judul}</p>
                  <p className="text-muted-foreground">{t.isi}</p>
                  <Link
                    href={t.href}
                    className="inline-flex min-h-11 w-fit items-center font-semibold text-primary underline-offset-4 hover:underline md:min-h-0"
                  >
                    {t.tautan}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="h-buku">
          <SectionTitle>
            <span id="h-buku">Buku induk</span>
          </SectionTitle>
          <dl className="divide-y">
            {ledger.map((l) => (
              <div key={l.label} className="flex items-baseline justify-between gap-4 py-3">
                <dt>
                  <Link href={l.href} className="font-semibold underline-offset-4 hover:underline">
                    {l.label}
                  </Link>
                  <span className="block text-sm text-muted-foreground">{l.ket}</span>
                </dt>
                <dd className="tabular font-heading text-2xl font-semibold">{l.nilai}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}
