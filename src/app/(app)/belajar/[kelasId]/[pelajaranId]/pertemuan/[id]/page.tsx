import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JENIS_ASESMEN_LABEL, STATUS_LABEL, formatHari, formatTanggal, toDateInput } from "@/lib/labels";
import { formatWaktu } from "@/lib/waktu";
import { SectionTitle } from "@/components/page";
import { ConfirmDelete } from "@/components/forms";
import { MateriList, pilihMateri } from "@/components/materi";
import { MateriDialog } from "@/components/materi-form";
import { Button } from "@/components/ui/button";
import {
  absenOnline,
  bukaAbsenOnline,
  deletePertemuan,
  hapusMateri,
  tambahMateriPertemuan,
  tutupAbsenOnline,
  updatePertemuan,
} from "../../../../actions";
import { BukaAbsenForm, TombolAksi, UbahPertemuanDialog } from "../../../../belajar-forms";
import { muatKursus } from "../../../../kursus";

export const metadata: Metadata = { title: "Pertemuan" };

export default async function PertemuanDetail({ params }: PageProps<"/belajar/[kelasId]/[pelajaranId]/pertemuan/[id]">) {
  const p = await params;
  const k = await muatKursus(p.kelasId, p.pelajaranId);
  const id = Number(p.id);
  if (!Number.isInteger(id)) notFound();

  const pt = await prisma.pertemuan.findFirst({
    where: { id, kelasId: k.kelas.id, pelajaranId: k.pelajaran.id },
    include: {
      materi: { select: pilihMateri, orderBy: { createdAt: "asc" } },
      absensi: { select: { siswaId: true, status: true, online: true } },
      asesmen: {
        where: k.kelola ? {} : { terbit: true },
        orderBy: { ditutup: "asc" },
        select: { id: true, judul: true, jenis: true, ditutup: true, terbit: true },
      },
    },
  });
  if (!pt) notFound();
  const [bahan, jumlahSiswa] = await Promise.all([
    prisma.bahanAjar.findUnique({
      where: { pelajaranId_tingkat_urutan: { pelajaranId: k.pelajaran.id, tingkat: k.kelas.tingkat, urutan: pt.urutan } },
      include: { materi: { select: pilihMateri, orderBy: { createdAt: "asc" } } },
    }),
    prisma.siswa.count({ where: { kelasId: k.kelas.id } }),
  ]);

  const now = new Date();
  const online = Boolean(pt.absenOnlineBuka && pt.absenOnlineTutup && now >= pt.absenOnlineBuka && now <= pt.absenOnlineTutup);
  const saya = k.user.siswaId ? pt.absensi.find((a) => a.siswaId === k.user.siswaId) : undefined;
  const hadir = pt.absensi.filter((a) => a.status === "HADIR").length;
  const hadirOnline = pt.absensi.filter((a) => a.online).length;

  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={k.base} className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:min-h-0">
            ← Semua pertemuan
          </Link>
          <h2 className="text-2xl font-semibold">
            <span className="tabular mr-2 text-muted-foreground">Ke-{pt.urutan}</span>
            {pt.judul}
          </h2>
          <p className="text-muted-foreground">
            {formatHari(pt.tanggal)}, {formatTanggal(pt.tanggal)}
          </p>
        </div>
        {k.kelola ? (
          <div className="flex gap-2">
            <UbahPertemuanDialog
              action={updatePertemuan.bind(null, pt.id)}
              initial={{ judul: pt.judul, tanggal: toDateInput(pt.tanggal), urutan: pt.urutan }}
            />
            <ConfirmDelete
              action={deletePertemuan.bind(null, pt.id)}
              title={`Hapus ${pt.judul}?`}
              description="Absensi dan materi dari guru di pertemuan ini ikut terhapus. Tugas yang terkait tetap ada."
            />
          </div>
        ) : null}
      </header>

      <section aria-labelledby="h-absen">
        <SectionTitle>
          <span id="h-absen">Kehadiran</span>
        </SectionTitle>
        {k.user.role === "SISWA" ? (
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {saya
                ? `Anda tercatat ${STATUS_LABEL[saya.status].toLowerCase()}${saya.online ? " lewat absen online" : ""}.`
                : online
                  ? `Absen online dibuka sampai ${formatWaktu(pt.absenOnlineTutup!)}.`
                  : "Belum diabsen. Guru mengisi kehadiran di kelas, atau membuka absen online untuk kelas daring."}
            </p>
            {online && !saya ? (
              <TombolAksi action={absenOnline.bind(null, pt.id)}>Saya hadir</TombolAksi>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 rounded-lg border bg-card p-4">
            <p className="tabular">
              {pt.absensi.length ? `${hadir} hadir dari ${jumlahSiswa} siswa` : "Absensi belum diisi"}
              {hadirOnline ? <span className="text-muted-foreground"> · {hadirOnline} lewat absen online</span> : null}
            </p>
            {k.kelola ? (
              <>
                {online ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                      <span className="rounded-sm bg-highlight px-2 py-0.5 font-semibold">Absen online dibuka</span>{" "}
                      sampai {formatWaktu(pt.absenOnlineTutup!)}. Siswa menekan &ldquo;Saya hadir&rdquo; di halaman ini.
                    </p>
                    <TombolAksi action={tutupAbsenOnline.bind(null, pt.id)} variant="outline">
                      Tutup sekarang
                    </TombolAksi>
                  </div>
                ) : (
                  <BukaAbsenForm action={bukaAbsenOnline.bind(null, pt.id)} />
                )}
                <div>
                  <Button asChild variant={pt.absensi.length ? "outline" : "default"}>
                    <Link href={`${k.base}/pertemuan/${pt.id}/absensi`}>
                      {pt.absensi.length ? "Ubah absensi kelas" : "Isi absensi kelas"}
                    </Link>
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </section>

      <section aria-labelledby="h-bahan">
        <SectionTitle>
          <span id="h-bahan">Bahan ajar sekolah</span>
        </SectionTitle>
        {bahan ? (
          <>
            {bahan.deskripsi ? <p className="mb-4 text-pretty">{bahan.deskripsi}</p> : null}
            <MateriList materi={bahan.materi} putar kosong="Bahan ajar ini belum berisi berkas." />
          </>
        ) : (
          <p className="text-muted-foreground">
            Sekolah belum menyiapkan bahan ajar untuk pertemuan ke-{pt.urutan} {k.pelajaran.nama} kelas {k.kelas.tingkat}.
          </p>
        )}
      </section>

      <section aria-labelledby="h-materi">
        <div className="flex items-end justify-between gap-4">
          <SectionTitle className="flex-1">
            <span id="h-materi">Materi dari guru</span>
          </SectionTitle>
          {k.kelola ? <MateriDialog action={tambahMateriPertemuan.bind(null, pt.id)} /> : null}
        </div>
        <MateriList
          materi={pt.materi}
          putar
          hapus={k.kelola ? (mid) => hapusMateri.bind(null, mid) : undefined}
          kosong={k.kelola ? "Belum ada. Tambahkan dokumen atau video untuk pertemuan ini." : "Guru belum menambahkan materi."}
        />
      </section>

      <section aria-labelledby="h-tugas">
        <SectionTitle>
          <span id="h-tugas">Tugas dari pertemuan ini</span>
        </SectionTitle>
        {pt.asesmen.length ? (
          <ul className="divide-y rounded-lg border bg-card">
            {pt.asesmen.map((a) => (
              <li key={a.id}>
                <Link href={`/asesmen/${a.id}`} className="flex min-h-14 flex-col justify-center gap-0.5 p-4 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
                  <span className="font-semibold">
                    {a.judul}
                    {!a.terbit ? <span className="ml-2 text-sm font-normal text-muted-foreground">(draf)</span> : null}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {JENIS_ASESMEN_LABEL[a.jenis]} · batas {formatWaktu(a.ditutup)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            {k.kelola ? "Tugas dan kuis dibuat di tab Tugas, kuis, ujian, dan bisa dikaitkan ke pertemuan ini." : "Tidak ada tugas di pertemuan ini."}
          </p>
        )}
      </section>
    </article>
  );
}
