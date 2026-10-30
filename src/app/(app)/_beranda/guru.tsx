import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { JENIS_ASESMEN_LABEL, formatNilai } from "@/lib/labels";
import { formatWaktu } from "@/lib/waktu";
import { daftarKursus, kelasUntuk } from "@/lib/lingkup";
import { DaftarBatang, GrafikTren } from "./grafik";
import {
  DeretAngka,
  JadwalHariIni,
  Panel,
  Selisih,
  formatPersen,
  keteranganRentang,
  rincianRekap,
  titikTren,
} from "./bagian";
import {
  hariSekarang,
  persen,
  rekapKehadiran,
  siswaAbsenTerbanyak,
  trenKehadiran,
  type Rentang,
} from "./data";

const HARI_MS = 86_400_000;

/** Teachers and wali kelas. A wali kelas also gets a section about their own class. */
export async function DashGuru({ user, r }: { user: CurrentUser; r: Rentang }) {
  const now = new Date();
  const hari = hariSekarang();
  const kursus = (await daftarKursus(user)).filter((k) => k.kelola).map(({ kelasId, pelajaranId }) => ({ kelasId, pelajaranId }));
  const diKursus = kursus.length ? { OR: kursus } : { id: -1 };
  const cakupan = { kursus };

  const [slot, perluNilai, berjalan, kini, lalu, tren, kelas] = await Promise.all([
    hari && user.guruId
      ? prisma.jadwal.findMany({
          where: { guruId: user.guruId, hari },
          orderBy: { jamMulai: "asc" },
          include: { pelajaran: { select: { nama: true } }, kelas: { select: { nama: true } } },
        })
      : [],
    prisma.asesmen.findMany({
      where: { ...diKursus, terbit: true, pengerjaan: { some: { dikumpulkan: { not: null }, nilai: null } } },
      orderBy: { ditutup: "asc" },
      select: {
        id: true,
        judul: true,
        jenis: true,
        kelas: { select: { nama: true } },
        _count: { select: { pengerjaan: { where: { dikumpulkan: { not: null }, nilai: null } } } },
      },
    }),
    // Open now, or closed in the last two weeks: the work whose hand-in rate still matters.
    prisma.asesmen.findMany({
      where: { ...diKursus, terbit: true, dibuka: { lte: now }, ditutup: { gte: new Date(now.getTime() - 14 * HARI_MS) } },
      orderBy: { ditutup: "desc" },
      take: 6,
      select: {
        id: true,
        judul: true,
        jenis: true,
        ditutup: true,
        kelas: { select: { nama: true, _count: { select: { siswa: true } } } },
        _count: { select: { pengerjaan: { where: { dikumpulkan: { not: null } } } } },
      },
    }),
    rekapKehadiran(cakupan, r.dari, r.sampai),
    r.sebelum ? rekapKehadiran(cakupan, r.sebelum.dari, r.sebelum.sampai) : null,
    trenKehadiran(cakupan, r.dari, r.sampai),
    prisma.kelas.findMany({
      where: { id: { in: [...new Set(kursus.map((k) => k.kelasId))] } },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
  ]);

  const totalNilai = perluNilai.reduce((s, a) => s + a._count.pengerjaan, 0);
  const dibuka = berjalan.filter((a) => a.ditutup >= now).length;
  const pctKini = persen(kini.semua);

  return (
    <div className="grid gap-10">
      <DeretAngka
        items={[
          { label: "Jam mengajar hari ini", nilai: String(slot.length), catatan: hari ? "pelajaran" : "Hari ini libur", href: "/jadwal-mengajar" },
          {
            label: "Perlu dinilai",
            nilai: String(totalNilai),
            catatan: totalNilai ? `di ${perluNilai.length} tugas` : "Semua sudah dinilai",
          },
          { label: "Tugas sedang dibuka", nilai: String(dibuka), href: "/belajar" },
          {
            label: "Kehadiran di kelas Anda",
            nilai: formatPersen(pctKini),
            catatan: r.sebelum ? <Selisih kini={pctKini} dulu={lalu ? persen(lalu.semua) : null} /> : keteranganRentang(r),
          },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-2">
        <Panel id="hari-ini" judul="Mengajar hari ini" tautan={{ href: "/jadwal-mengajar", label: "Jadwal sepekan" }}>
          <JadwalHariIni
            kosong={hari ? "Tidak ada jam mengajar hari ini." : "Hari ini bukan hari sekolah."}
            slots={slot.map((s) => ({
              id: s.id,
              mulai: s.jamMulai,
              selesai: s.jamSelesai,
              judul: `${s.pelajaran.nama} · ${s.kelas.nama}`,
              sub: "Buka kelas belajar",
              href: `/belajar/${s.kelasId}/${s.pelajaranId}`,
            }))}
          />
        </Panel>

        <Panel id="nilai" judul="Perlu dinilai" keterangan="Jawaban essay dan berkas yang sudah dikumpulkan siswa.">
          {perluNilai.length ? (
            <ul className="divide-y rounded-md border bg-card">
              {perluNilai.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/asesmen/${a.id}`}
                    className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{a.judul}</span>
                      <span className="block text-sm text-muted-foreground">
                        {JENIS_ASESMEN_LABEL[a.jenis]} · {a.kelas.nama}
                      </span>
                    </span>
                    <span className="tabular rounded-sm bg-highlight px-2 py-0.5 text-sm font-semibold text-foreground">
                      {a._count.pengerjaan} jawaban
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Tidak ada jawaban yang menunggu nilai. Pilihan ganda dinilai otomatis.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <Panel
          id="kumpul"
          judul="Pengumpulan tugas"
          keterangan="Tugas yang sedang dibuka atau ditutup dalam dua pekan terakhir."
        >
          {berjalan.length ? (
            <DaftarBatang
              judul="Persentase siswa yang sudah mengumpulkan"
              rows={berjalan.map((a) => {
                const total = a.kelas._count.siswa;
                const n = a._count.pengerjaan;
                return {
                  key: a.id,
                  label: `${a.kelas.nama} · ${a.judul}`,
                  nilai: total ? (n / total) * 100 : null,
                  tampil: total ? `${Math.round((n / total) * 100)}%` : "–",
                  rincian: [
                    `${n} dari ${total} siswa mengumpulkan`,
                    `${a.ditutup >= now ? "Batas" : "Ditutup"} ${formatWaktu(a.ditutup)}`,
                  ],
                  href: `/asesmen/${a.id}`,
                };
              })}
            />
          ) : (
            <p className="text-muted-foreground">
              Belum ada tugas atau kuis yang dibuka dalam dua pekan terakhir. Buat dari tab Tugas di kelas belajar.
            </p>
          )}
        </Panel>

        <Panel id="hadir" judul="Kehadiran per kelas" keterangan={`Di pelajaran Anda, ${keteranganRentang(r)}.`}>
          {kini.semua.total ? (
            <DaftarBatang
              judul="Persentase kehadiran per kelas yang Anda ajar"
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
            <p className="text-muted-foreground">Belum ada absensi di pelajaran Anda pada periode ini.</p>
          )}
        </Panel>
      </div>

      {tren.titik.length > 1 ? (
        <Panel id="tren" judul="Tren kehadiran di kelas Anda" keterangan={keteranganRentang(r)}>
          <GrafikTren judul="Tren kehadiran di pelajaran Anda" titik={titikTren(tren, r.dari)} />
        </Panel>
      ) : null}

      {user.role === "WALI_KELAS" ? <Perwalian user={user} r={r} /> : null}
    </div>
  );
}

/** The wali kelas' own class: how it is doing and which students need a conversation. */
async function Perwalian({ user, r }: { user: CurrentUser; r: Rentang }) {
  const kelasIds = (await kelasUntuk(user, "wali")) ?? [];
  if (!kelasIds.length) return null;
  const now = new Date();
  const [kelas, kini, tren, absen, tugas] = await Promise.all([
    prisma.kelas.findMany({
      where: { id: { in: kelasIds } },
      select: { id: true, nama: true, siswa: { select: { id: true, nama: true, noInduk: true }, orderBy: { nama: "asc" } } },
    }),
    rekapKehadiran({ kelasIds }, r.dari, r.sampai),
    trenKehadiran({ kelasIds }, r.dari, r.sampai),
    siswaAbsenTerbanyak(kelasIds, r.dari, r.sampai),
    prisma.asesmen.findMany({
      where: { kelasId: { in: kelasIds }, terbit: true, ditutup: { gte: r.dari, lte: now } },
      select: { pengerjaan: { where: { dikumpulkan: { not: null } }, select: { siswaId: true } } },
    }),
  ]);

  const siswa = kelas.flatMap((k) => k.siswa);
  const absenPer = new Map(absen.map((a) => [a.siswaId, a]));
  const kurang = new Map<number, number>();
  for (const t of tugas) {
    const sudah = new Set(t.pengerjaan.map((p) => p.siswaId));
    for (const s of siswa) if (!sudah.has(s.id)) kurang.set(s.id, (kurang.get(s.id) ?? 0) + 1);
  }
  // Unexplained absence weighs most; a missed task counts like one; lateness counts half.
  const perhatian = siswa
    .map((s) => {
      const a = absenPer.get(s.id);
      const alpa = a?.alpa ?? 0;
      const telat = a?.telat ?? 0;
      const tak = kurang.get(s.id) ?? 0;
      return { s, alpa, telat, tak, skor: alpa * 2 + tak + telat * 0.5 };
    })
    .filter((x) => x.skor > 0)
    .sort((a, b) => b.skor - a.skor)
    .slice(0, 6);

  const nama = kelas.map((k) => k.nama).join(", ");
  const p = persen(kini.semua);
  return (
    <section aria-labelledby="perwalian" className="grid gap-6 rounded-lg border bg-card p-5 sm:p-6">
      <div>
        <h2 id="perwalian" className="text-xl font-semibold">
          Kelas perwalian {nama}
        </h2>
        <p className="text-muted-foreground">
          Kehadiran {formatPersen(p)} di semua pelajaran, {keteranganRentang(r)}.
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Panel id="perhatian" judul="Siswa perlu perhatian" tautan={{ href: "/rapor", label: "Buka rapor" }}>
          {perhatian.length ? (
            <ul className="grid gap-1">
              {perhatian.map(({ s, alpa, telat, tak }) => (
                <li key={s.id}>
                  <Link
                    href={`/rapor?no=${s.noInduk}`}
                    className="block rounded-md px-2 py-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="block font-semibold">{s.nama}</span>
                    <span className="block text-sm text-muted-foreground">
                      {[
                        alpa && `${alpa} kali tanpa keterangan`,
                        telat && `${telat} kali terlambat`,
                        tak && `${tak} tugas tidak dikumpulkan`,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              Tidak ada siswa yang absen tanpa keterangan, terlambat, atau melewatkan tugas di periode ini.
            </p>
          )}
        </Panel>
        <Panel id="tren-wali" judul="Tren kehadiran kelas">
          {tren.titik.length ? (
            <GrafikTren judul={`Tren kehadiran kelas ${nama}`} titik={titikTren(tren, r.dari)} />
          ) : (
            <p className="text-muted-foreground">Belum ada absensi di kelas ini pada periode ini.</p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            Rata-rata {formatNilai(p ?? 0)}% dari {kini.semua.total} catatan absensi.
          </p>
        </Panel>
      </div>
    </section>
  );
}
