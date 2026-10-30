import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatHari, formatTanggal, hariIni, hariIniInput } from "@/lib/labels";
import { EmptyState } from "@/components/page";
import { createPertemuan } from "../../actions";
import { PertemuanDialog } from "../../belajar-forms";
import { muatKursus } from "../../kursus";

export const metadata: Metadata = { title: "Pertemuan" };

export default async function PertemuanList({ params }: PageProps<"/belajar/[kelasId]/[pelajaranId]">) {
  const p = await params;
  const k = await muatKursus(p.kelasId, p.pelajaranId);
  const now = new Date();
  const today = hariIni();

  const [pertemuan, bahanAjar, jumlahSiswa] = await Promise.all([
    prisma.pertemuan.findMany({
      where: { kelasId: k.kelas.id, pelajaranId: k.pelajaran.id },
      orderBy: [{ urutan: "desc" }, { tanggal: "desc" }],
      include: {
        _count: { select: { materi: true, asesmen: { where: k.kelola ? {} : { terbit: true } } } },
        absensi: { select: { status: true, siswaId: true } },
      },
    }),
    prisma.bahanAjar.findMany({
      where: { pelajaranId: k.pelajaran.id, tingkat: k.kelas.tingkat },
      select: { urutan: true, judul: true, _count: { select: { materi: true } } },
    }),
    prisma.siswa.count({ where: { kelasId: k.kelas.id } }),
  ]);
  const bahan = new Map(bahanAjar.map((b) => [b.urutan, b]));
  const berikut = (pertemuan[0]?.urutan ?? 0) + 1;

  return (
    <>
      {k.kelola ? (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            {bahanAjar.length
              ? `Sekolah menyiapkan bahan ajar untuk ${bahanAjar.length} pertemuan ${k.pelajaran.nama} kelas ${k.kelas.tingkat}.`
              : `Belum ada bahan ajar sekolah untuk ${k.pelajaran.nama} kelas ${k.kelas.tingkat}; materi diisi guru sendiri.`}
          </p>
          <PertemuanDialog
            action={createPertemuan.bind(null, k.kelas.id, k.pelajaran.id)}
            initial={{ urutan: berikut, tanggal: hariIniInput(), judul: bahan.get(berikut)?.judul ?? `Pertemuan ${berikut}` }}
          />
        </div>
      ) : null}

      {pertemuan.length === 0 ? (
        <EmptyState title="Belum ada pertemuan">
          {k.kelola
            ? "Buat pertemuan dengan tombol Tambah pertemuan. Bahan ajar sekolah untuk nomor itu langsung ikut tampil."
            : "Pertemuan dan materinya muncul di sini setelah guru membuatnya."}
        </EmptyState>
      ) : (
        <ol className="divide-y rounded-lg border bg-card">
          {pertemuan.map((pt) => {
            const b = bahan.get(pt.urutan);
            const online = pt.absenOnlineBuka && pt.absenOnlineTutup && now >= pt.absenOnlineBuka && now <= pt.absenOnlineTutup;
            const saya = k.user.siswaId ? pt.absensi.find((a) => a.siswaId === k.user.siswaId) : undefined;
            const hadir = pt.absensi.filter((a) => a.status === "HADIR").length;
            const materi = pt._count.materi + (b?._count.materi ?? 0);
            return (
              <li key={pt.id}>
                <Link
                  href={`${k.base}/pertemuan/${pt.id}`}
                  className="group grid gap-1 p-4 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                >
                  <span className="tabular text-sm text-muted-foreground">Ke-{pt.urutan}</span>
                  <span className="min-w-0">
                    <span className="block font-semibold group-hover:underline">{pt.judul}</span>
                    <span className="block text-sm text-muted-foreground">
                      {formatHari(pt.tanggal)}, {formatTanggal(pt.tanggal)}
                      {pt.tanggal.getTime() === today.getTime() ? " · hari ini" : ""} · {materi} materi
                      {pt._count.asesmen ? ` · ${pt._count.asesmen} tugas` : ""}
                    </span>
                  </span>
                  <span className="text-sm">
                    {online ? (
                      <span className="rounded-sm bg-highlight px-2 py-0.5 font-semibold">Absen online dibuka</span>
                    ) : k.user.role === "SISWA" ? (
                      <span className="text-muted-foreground">{saya ? (saya.status === "HADIR" ? "Hadir" : "Tidak hadir") : "Belum diabsen"}</span>
                    ) : (
                      <span className="tabular text-muted-foreground">
                        {pt.absensi.length ? `${hadir} hadir dari ${jumlahSiswa}` : "Absensi belum diisi"}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
