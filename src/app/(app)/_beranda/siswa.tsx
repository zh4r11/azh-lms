import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { JENIS_ASESMEN_LABEL, SEMESTER_LABEL, formatNilai } from "@/lib/labels";
import { formatWaktu } from "@/lib/waktu";
import { cn } from "@/lib/utils";
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
import { hariSekarang, persen, rekapKehadiran, semesterSekarang, trenKehadiran, type Rentang } from "./data";

const JAM_MS = 3_600_000;

function sisaWaktu(batas: Date, now: Date) {
  const jam = (batas.getTime() - now.getTime()) / JAM_MS;
  if (jam < 1) return "kurang dari 1 jam lagi";
  if (jam < 24) return `${Math.floor(jam)} jam lagi`;
  return `${Math.floor(jam / 24)} hari lagi`;
}

export async function DashSiswa({ user, r }: { user: CurrentUser; r: Rentang }) {
  const siswa = user.siswaId
    ? await prisma.siswa.findUnique({ where: { id: user.siswaId }, select: { id: true, kelasId: true, kelas: { select: { nama: true } } } })
    : null;
  if (!siswa?.kelasId) {
    return (
      <p className="text-muted-foreground">
        Akun Anda belum terhubung ke data siswa yang punya kelas, jadi jadwal, tugas, dan kehadiran belum bisa ditampilkan.
        Minta admin sekolah menghubungkannya.
      </p>
    );
  }
  const now = new Date();
  const hari = hariSekarang();
  const semester = semesterSekarang();
  const cakupan = { siswaId: siswa.id };

  const [slot, tugas, kini, lalu, tren, nilai] = await Promise.all([
    hari
      ? prisma.jadwal.findMany({
          where: { kelasId: siswa.kelasId, hari },
          orderBy: { jamMulai: "asc" },
          include: { pelajaran: { select: { nama: true } }, guru: { select: { nama: true } } },
        })
      : [],
    prisma.asesmen.findMany({
      where: {
        kelasId: siswa.kelasId,
        terbit: true,
        ditutup: { gte: now },
        pengerjaan: { none: { siswaId: siswa.id, dikumpulkan: { not: null } } },
      },
      orderBy: { ditutup: "asc" },
      select: { id: true, judul: true, jenis: true, dibuka: true, ditutup: true, pelajaran: { select: { nama: true } } },
    }),
    rekapKehadiran(cakupan, r.dari, r.sampai),
    r.sebelum ? rekapKehadiran(cakupan, r.sebelum.dari, r.sebelum.sampai) : null,
    trenKehadiran(cakupan, r.dari, r.sampai),
    prisma.pengerjaan.findMany({
      where: { siswaId: siswa.id, nilai: { not: null }, asesmen: { semester, terbit: true } },
      select: {
        nilai: true,
        asesmen: { select: { pelajaranId: true, kelasId: true, tampilkanHasil: true, ditutup: true, pelajaran: { select: { nama: true } } } },
      },
    }),
  ]);

  // Only grades the teacher lets the student see already.
  const perMapel = new Map<number, { nama: string; kelasId: number; jumlah: number; n: number }>();
  for (const p of nilai) {
    if (!p.asesmen.tampilkanHasil && p.asesmen.ditutup > now) continue;
    const k = perMapel.get(p.asesmen.pelajaranId) ?? { nama: p.asesmen.pelajaran.nama, kelasId: p.asesmen.kelasId, jumlah: 0, n: 0 };
    k.jumlah += p.nilai ?? 0;
    k.n += 1;
    perMapel.set(p.asesmen.pelajaranId, k);
  }
  const mapel = [...perMapel.entries()].map(([id, v]) => ({ id, ...v, rata: v.jumlah / v.n }));
  const semua = mapel.reduce((s, m) => s + m.jumlah, 0) / Math.max(1, mapel.reduce((s, m) => s + m.n, 0));

  const pctKini = persen(kini.semua);
  const bisaDikerjakan = tugas.filter((t) => t.dibuka <= now);
  const mendesak = bisaDikerjakan.filter((t) => t.ditutup.getTime() - now.getTime() < 24 * JAM_MS).length;

  return (
    <div className="grid gap-10">
      <DeretAngka
        items={[
          {
            label: "Kehadiran saya",
            nilai: formatPersen(pctKini),
            catatan: r.sebelum ? <Selisih kini={pctKini} dulu={lalu ? persen(lalu.semua) : null} /> : keteranganRentang(r),
          },
          {
            label: "Tugas belum dikerjakan",
            nilai: String(bisaDikerjakan.length),
            catatan: mendesak ? `${mendesak} berakhir dalam 24 jam` : bisaDikerjakan.length ? "Tidak ada yang mendesak" : "Semua sudah dikumpulkan",
            href: "/belajar",
          },
          {
            label: "Rata-rata nilai online",
            nilai: mapel.length ? formatNilai(semua) : "–",
            catatan: `${SEMESTER_LABEL[semester]}, tugas, kuis, dan ujian`,
          },
          { label: "Pelajaran hari ini", nilai: String(slot.length), catatan: siswa.kelas?.nama, href: "/jadwal" },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-2">
        <Panel id="tugas" judul="Tugas yang harus dikerjakan">
          {tugas.length ? (
            <ul className="divide-y rounded-md border bg-card">
              {tugas.map((t) => {
                const belum = t.dibuka > now;
                const dekat = !belum && t.ditutup.getTime() - now.getTime() < 24 * JAM_MS;
                return (
                  <li key={t.id}>
                    <Link
                      href={`/asesmen/${t.id}`}
                      className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{t.judul}</span>
                        <span className="block text-sm text-muted-foreground">
                          {JENIS_ASESMEN_LABEL[t.jenis]} · {t.pelajaran.nama} ·{" "}
                          {belum ? `dibuka ${formatWaktu(t.dibuka)}` : `batas ${formatWaktu(t.ditutup)}`}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "text-sm whitespace-nowrap",
                          dekat ? "rounded-sm bg-highlight px-2 py-0.5 font-semibold text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {belum ? "Belum dibuka" : sisaWaktu(t.ditutup, now)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              Tidak ada tugas, kuis, atau ujian online yang menunggu. Yang baru diterbitkan guru akan muncul di sini.
            </p>
          )}
        </Panel>

        <Panel id="hari-ini" judul={`Jadwal hari ini, ${siswa.kelas?.nama ?? ""}`} tautan={{ href: "/jadwal", label: "Jadwal sepekan" }}>
          <JadwalHariIni
            kosong={hari ? "Tidak ada pelajaran hari ini." : "Hari ini bukan hari sekolah."}
            slots={slot.map((s) => ({
              id: s.id,
              mulai: s.jamMulai,
              selesai: s.jamSelesai,
              judul: s.pelajaran.nama,
              sub: s.guru?.nama ?? "Guru belum ditentukan",
              href: `/belajar/${s.kelasId}/${s.pelajaranId}`,
            }))}
          />
        </Panel>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <Panel
          id="nilai"
          judul="Nilai per mata pelajaran"
          keterangan="Rata-rata tugas, kuis, dan ujian online yang sudah dinilai. Garis tegak menandai KKM 75."
        >
          {mapel.length ? (
            <DaftarBatang
              judul="Rata-rata nilai online per mata pelajaran"
              garis={{ nilai: 75, label: "KKM 75" }}
              rows={mapel
                .sort((a, b) => a.nama.localeCompare(b.nama))
                .map((m) => ({
                  key: m.id,
                  label: m.nama,
                  nilai: m.rata,
                  tampil: formatNilai(m.rata),
                  rincian: [`Dari ${m.n} tugas, kuis, atau ujian`],
                  href: `/belajar/${m.kelasId}/${m.id}/nilai`,
                }))}
            />
          ) : (
            <p className="text-muted-foreground">
              Belum ada nilai online di {SEMESTER_LABEL[semester].toLowerCase()}. Nilai muncul setelah guru menilai tugas Anda.
            </p>
          )}
        </Panel>

        <Panel id="hadir" judul="Kehadiran saya" keterangan={keteranganRentang(r)}>
          {tren.titik.length ? (
            <GrafikTren judul="Tren kehadiran saya" titik={titikTren(tren, r.dari)} />
          ) : (
            <p className="text-muted-foreground">Belum ada absensi Anda di periode ini.</p>
          )}
          {kini.semua.total ? (
            <p className="mt-3 text-sm text-muted-foreground">{rincianRekap(kini.semua).join(". ")}.</p>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
