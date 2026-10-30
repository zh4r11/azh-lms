import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatHari, formatTanggal, hariIni } from "@/lib/labels";
import { whereUjian } from "@/lib/lingkup";
import { FilterPeriode, Panel } from "./_beranda/bagian";
import { parsePeriode, rentang } from "./_beranda/data";
import { DashAdmin } from "./_beranda/admin";
import { DashGuru } from "./_beranda/guru";
import { DashSiswa } from "./_beranda/siswa";

const JUDUL = {
  ADMIN: ["Kegiatan belajar di sekolah", "Kegiatan"],
  GURU: ["Kelas Anda hari ini", "hari ini"],
  WALI_KELAS: ["Kelas Anda hari ini", "hari ini"],
  SISWA: ["Belajar hari ini", "hari ini"],
} as const;

export default async function Beranda({ searchParams }: PageProps<"/">) {
  const user = await requireRole();
  const r = rentang(parsePeriode((await searchParams).periode));
  const today = hariIni();
  const ujian = await prisma.jadwalUjian.findMany({
    where: { ...(await whereUjian(user)), tanggal: { gte: today } },
    include: { pelajaran: true, kelas: true },
    orderBy: [{ tanggal: "asc" }, { jamMulai: "asc" }, { kelas: { nama: "asc" } }],
    take: 4,
  });
  const [judul, tanda] = JUDUL[user.role];
  const [awal, akhir] = judul.split(tanda);

  return (
    <div className="grid gap-10">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-muted-foreground">
            Selamat datang, {user.name}. {formatHari(today)}, {formatTanggal(today)}.
          </p>
          <h1 className="mt-2 text-4xl leading-[1.08] font-semibold text-balance sm:text-5xl">
            {awal}
            <span className="highlight-mark">{tanda}</span>
            {akhir}
          </h1>
        </div>
        <FilterPeriode aktif={r.periode} />
      </header>

      {user.role === "ADMIN" ? (
        <DashAdmin r={r} />
      ) : user.role === "SISWA" ? (
        <DashSiswa user={user} r={r} />
      ) : (
        <DashGuru user={user} r={r} />
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        <Panel id="ujian-terdekat" judul="Ujian terdekat" tautan={{ href: "/ujian", label: "Semua jadwal ujian" }}>
          {ujian.length === 0 ? (
            <p className="text-muted-foreground">Belum ada ujian yang dijadwalkan mulai hari ini.</p>
          ) : (
            <ol className="grid gap-4">
              {ujian.map((u) => (
                <li key={u.id}>
                  <p className="font-semibold">
                    {u.pelajaran.nama}
                    {user.role === "SISWA" ? null : <span className="font-normal text-muted-foreground"> · {u.kelas.nama}</span>}
                  </p>
                  <p className="tabular text-sm text-muted-foreground">
                    {formatHari(u.tanggal)}, {formatTanggal(u.tanggal)} · {u.jamMulai} sampai {u.jamSelesai} · {u.ruang}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <details className="group self-start">
          <summary className="rule-double flex min-h-11 cursor-pointer list-none items-center justify-between text-lg font-semibold">
            Profil sekolah
            <span className="text-sm font-normal text-muted-foreground group-open:hidden">Tampilkan</span>
            <span className="hidden text-sm font-normal text-muted-foreground group-open:inline">Sembunyikan</span>
          </summary>
          <div className="mt-4 grid gap-4 leading-relaxed text-pretty">
            <p>
              SMA Negeri Prabsky 02 Konoha adalah salah satu lembaga pendidikan tingkat menengah atas di Konoha yang
              beroperasi sejak tahun 1988 berdasarkan SK No. 12/0/1988 tanggal 8 Februari 1988. Sejak itu sekolah telah
              banyak berkembang, baik dari sisi bangunan, prestasi akademik, maupun prestasi kegiatan ekstrakurikuler.
            </p>
            <p>
              Perkembangan tersebut diperoleh berkat kerja keras kepala sekolah beserta seluruh jajarannya, dukungan orang
              tua siswa yang tergabung dalam Komite Sekolah, dukungan masyarakat di sekitar sekolah, serta bimbingan
              instansi terkait, terutama Dinas Pendidikan Konoha.
            </p>
            <p>
              Walaupun terletak di pinggiran kota, siswa SMA Negeri Prabsky 02 Konoha berhasil menempatkan diri sejajar
              dengan SMA lain di Konoha, bahkan sampai tingkat negeri. Karena itu SMA Negeri Prabsky 02 menjadi salah satu
              pilihan utama orang tua dalam penerimaan siswa baru.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
