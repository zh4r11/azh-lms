import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SEMESTER_LABEL, formatNilai, formatTanggal, hariIni } from "@/lib/labels";
import { DaftarBatang, GrafikTren } from "./grafik";
import {
  DeretAngka,
  Panel,
  Selisih,
  formatPersen,
  keteranganRentang,
  rincianRekap,
  titikTren,
} from "./bagian";
import { persen, rekapKehadiran, semesterSekarang, trenKehadiran, type Rentang } from "./data";

const HARI_MS = 86_400_000;

export async function DashAdmin({ r }: { r: Rentang }) {
  const semester = semesterSekarang();
  const today = hariIni();
  const duaPekan = new Date(today.getTime() + 14 * HARI_MS);
  const now = new Date();

  const [siswa, guru, kelas, kini, lalu, tren, nilaiMapel, pelajaran, tanpaPengawas, onlineBelum, asesmenTutup] =
    await Promise.all([
      prisma.siswa.count({ where: { kelasId: { not: null } } }),
      prisma.guru.count(),
      prisma.kelas.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true, _count: { select: { siswa: true } } } }),
      rekapKehadiran({ semua: true }, r.dari, r.sampai),
      r.sebelum ? rekapKehadiran({ semua: true }, r.sebelum.dari, r.sebelum.sampai) : null,
      trenKehadiran({ semua: true }, r.dari, r.sampai),
      prisma.nilai.groupBy({ by: ["pelajaranId"], where: { semester }, _avg: { nilai: true }, _count: true }),
      prisma.pelajaran.findMany({ select: { id: true, nama: true } }),
      prisma.jadwalUjian.count({ where: { tanggal: { gte: today, lte: duaPekan }, pengawasId: null } }),
      prisma.jadwalUjian.count({ where: { tanggal: { gte: today, lte: duaPekan }, asesmen: null } }),
      // Online work that closed in the period, to see how much of it students actually handed in.
      prisma.asesmen.findMany({
        where: { terbit: true, ditutup: { gte: r.dari, lte: now } },
        select: { kelasId: true, _count: { select: { pengerjaan: { where: { dikumpulkan: { not: null } } } } } },
      }),
    ]);

  const namaMapel = new Map(pelajaran.map((p) => [p.id, p.nama]));
  const siswaKelas = new Map(kelas.map((k) => [k.id, k._count.siswa]));
  const pctKini = persen(kini.semua);
  let diharap = 0;
  let masuk = 0;
  for (const a of asesmenTutup) {
    diharap += siswaKelas.get(a.kelasId) ?? 0;
    masuk += a._count.pengerjaan;
  }

  const tindak = [
    tanpaPengawas && {
      n: tanpaPengawas,
      teks: "ujian dalam dua pekan ke depan belum punya pengawas",
      href: "/ujian",
      aksi: "Atur pengawas",
    },
    onlineBelum && {
      n: onlineBelum,
      teks: "ujian dalam dua pekan ke depan belum disiapkan online oleh guru mapel",
      href: "/ujian",
      aksi: "Lihat jadwal ujian",
    },
  ].filter(Boolean) as { n: number; teks: string; href: string; aksi: string }[];

  return (
    <div className="grid gap-10">
      <DeretAngka
        items={[
          { label: "Siswa aktif", nilai: String(siswa), catatan: `di ${kelas.length} kelas`, href: "/siswa" },
          { label: "Guru", nilai: String(guru), href: "/guru" },
          {
            label: "Kehadiran siswa",
            nilai: formatPersen(pctKini),
            catatan: r.sebelum ? <Selisih kini={pctKini} dulu={lalu ? persen(lalu.semua) : null} /> : keteranganRentang(r),
          },
          {
            label: "Tugas online terkumpul",
            nilai: diharap ? formatPersen((masuk / diharap) * 100) : "–",
            catatan: diharap ? `${masuk} dari ${diharap} pengumpulan` : "Belum ada tugas yang ditutup",
          },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel
          id="hadir-kelas"
          judul="Kehadiran per kelas"
          keterangan={`${keteranganRentang(r)}. Arahkan kursor ke batang untuk rinciannya.`}
        >
          {kini.semua.total ? (
            <DaftarBatang
              judul="Persentase kehadiran per kelas"
              rows={kelas.map((k) => {
                const rk = kini.perKelas.get(k.id);
                const p = rk ? persen(rk) : null;
                return {
                  key: k.id,
                  label: k.nama,
                  nilai: p,
                  tampil: formatPersen(p),
                  rincian: rk ? rincianRekap(rk) : ["Belum ada absensi di periode ini"],
                };
              })}
            />
          ) : (
            <p className="text-muted-foreground">Belum ada absensi yang diisi guru di periode ini.</p>
          )}
        </Panel>

        <Panel id="tindak" judul="Perlu ditindak" tautan={{ href: "/dashboard", label: "Kelengkapan data" }}>
          {tindak.length ? (
            <ul className="grid gap-3">
              {tindak.map((t) => (
                <li key={t.teks} className="grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-3">
                  <span className="tabular font-heading text-2xl font-semibold">{t.n}</span>
                  <span>
                    {t.teks}.{" "}
                    <Link href={t.href} className="font-semibold text-primary underline-offset-4 hover:underline">
                      {t.aksi}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              Semua ujian dua pekan ke depan sudah punya pengawas dan sudah disiapkan online. Kelas tanpa wali atau jadwal
              dicek di halaman Kelengkapan data.
            </p>
          )}
        </Panel>
      </div>

      <Panel
        id="tren"
        judul="Tren kehadiran"
        keterangan={`Persentase siswa hadir ${tren.satuan === "pekan" ? "per pekan" : "per hari"}, ${keteranganRentang(r)}.`}
      >
        {tren.titik.length ? (
          <GrafikTren judul="Tren kehadiran seluruh sekolah" titik={titikTren(tren, r.dari)} />
        ) : (
          <p className="text-muted-foreground">Belum ada absensi di periode ini, jadi trennya belum bisa digambar.</p>
        )}
      </Panel>

      <Panel
        id="nilai-mapel"
        judul="Rata-rata nilai rapor per mata pelajaran"
        keterangan={`${SEMESTER_LABEL[semester]}, dari nilai yang sudah masuk rapor. Garis tegak menandai KKM 75.`}
        tautan={{ href: "/nilai/ujian", label: "Buka nilai ujian" }}
      >
        {nilaiMapel.length ? (
          <DaftarBatang
            judul="Rata-rata nilai rapor per mata pelajaran"
            garis={{ nilai: 75, label: "KKM 75" }}
            rows={nilaiMapel
              .map((n) => ({ id: n.pelajaranId, rata: n._avg.nilai ?? 0, n: n._count }))
              .sort((a, b) => a.rata - b.rata)
              .map((n) => ({
                key: n.id,
                label: namaMapel.get(n.id) ?? "Mapel",
                nilai: n.rata,
                tampil: formatNilai(n.rata),
                rincian: [`${n.n} nilai siswa`],
              }))}
          />
        ) : (
          <p className="text-muted-foreground">
            Belum ada nilai rapor di {SEMESTER_LABEL[semester].toLowerCase()}. Nilai muncul setelah guru mengisinya atau
            menghitungnya dari kelas belajar.
          </p>
        )}
      </Panel>
      <p className="text-sm text-muted-foreground">Data dihitung ulang setiap kali halaman dibuka, per {formatTanggal(today)}.</p>
    </div>
  );
}
