import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JENIS_ASESMEN_LABEL, SEMESTER_LABEL, formatNilai } from "@/lib/labels";
import { formatDurasi, formatWaktu, keInputWaktu } from "@/lib/waktu";
import { EmptyState, PageHeader, SectionTitle, TableBox } from "@/components/page";
import { ConfirmDelete } from "@/components/forms";
import { SoalBaruDialog } from "@/components/soal-form";
import { SoalIsi } from "@/components/soal-view";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TombolAksi } from "@/app/(app)/belajar/belajar-forms";
import { ambilDariBank, lepasSoal, soalBaruUntukAsesmen, ubahBobot } from "@/app/(app)/bank-soal/actions";
import { deleteAsesmen, kumpulkan, kumpulkanBerkas, mulaiKerjakan, setTerbit, updateAsesmen } from "../actions";
import { AsesmenDialog } from "../asesmen-form";
import { AmbilBankDialog, BobotForm, KumpulBerkasForm } from "../asesmen-client";
import { muatAsesmen } from "../muat";

export async function generateMetadata({ params }: PageProps<"/asesmen/[id]">): Promise<Metadata> {
  const { a } = await muatAsesmen((await params).id);
  return { title: a.judul };
}

function Info({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="mb-8 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex gap-2 border-b border-dotted py-1">
          <dt className="w-32 shrink-0 text-muted-foreground">{k}</dt>
          <dd className="min-w-0 font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function AsesmenPage({ params }: PageProps<"/asesmen/[id]">) {
  const { user, a, kelola, base } = await muatAsesmen((await params).id);
  const now = new Date();
  const dibuka = now >= a.dibuka && now <= a.ditutup;
  const jenis = JENIS_ASESMEN_LABEL[a.jenis];

  const info: [string, React.ReactNode][] = [
    ["Kelas belajar", <Link key="k" href={base} className="underline underline-offset-4">{`${a.pelajaran.nama}, ${a.kelas.nama}`}</Link>],
    ["Bentuk", a.mode === "SOAL" ? "Jawab soal di LMS" : "Unggah berkas jawaban"],
    ["Dibuka", formatWaktu(a.dibuka)],
    ["Batas waktu", formatWaktu(a.ditutup)],
    ...(a.durasiMenit ? ([["Waktu mengerjakan", formatDurasi(a.durasiMenit)]] as [string, string][]) : []),
    ...(a.jadwalUjian ? ([["Ruang", a.jadwalUjian.ruang]] as [string, string][]) : []),
    ...(a.pertemuan ? ([["Pertemuan", `Ke-${a.pertemuan.urutan}: ${a.pertemuan.judul}`]] as [string, string][]) : []),
  ];

  return (
    <>
      <PageHeader
        title={a.judul}
        mark={a.judul.split(/[s:]/)[0]}
        back={{ href: `${base}/tugas`, label: "Tugas, kuis, ujian" }}
        description={`${jenis} ${a.pelajaran.nama} kelas ${a.kelas.nama} · ${SEMESTER_LABEL[a.semester]}${kelola && !a.terbit ? " · draf, belum terlihat siswa" : ""}`}
        actions={
          kelola ? (
            <div className="flex flex-wrap gap-2">
              <AsesmenDialog
                action={updateAsesmen.bind(null, a.id)}
                pertemuan={[]}
                initial={{
                  jenis: a.jenis,
                  mode: a.mode,
                  judul: a.judul,
                  instruksi: a.instruksi,
                  semester: a.semester,
                  dibuka: keInputWaktu(a.dibuka),
                  ditutup: keInputWaktu(a.ditutup),
                  durasiMenit: a.durasiMenit,
                  pertemuanId: a.pertemuanId,
                  lampiran: a.lampiran ? { id: a.lampiran.id, nama: a.lampiran.nama } : null,
                  acakSoal: a.acakSoal,
                  tampilkanHasil: a.tampilkanHasil,
                  waktuTerkunci: Boolean(a.jadwalUjianId),
                }}
              />
              <TombolAksi action={setTerbit.bind(null, a.id, !a.terbit)} variant={a.terbit ? "outline" : "default"}>
                {a.terbit ? "Tarik jadi draf" : "Terbitkan"}
              </TombolAksi>
              <ConfirmDelete
                action={deleteAsesmen.bind(null, a.id)}
                title={`Hapus ${a.judul}?`}
                description="Semua jawaban dan nilai siswa untuk ini ikut terhapus. Soal di bank soal tetap ada."
              />
            </div>
          ) : null
        }
      />
      <Info items={info} />
      {a.instruksi ? <p className="mb-8 max-w-prose whitespace-pre-wrap text-pretty">{a.instruksi}</p> : null}
      {a.lampiran ? (
        <p className="mb-8">
          <Button asChild variant="outline">
            <a href={`/berkas/${a.lampiran.id}`} target="_blank" rel="noreferrer">
              Buka lembar soal ({a.lampiran.nama})
            </a>
          </Button>
        </p>
      ) : null}

      {kelola ? <BagianGuru id={a.id} /> : user.role === "SISWA" ? <BagianSiswa id={a.id} siswaId={user.siswaId} dibuka={dibuka} /> : <BagianLihat id={a.id} />}
    </>
  );
}

// ---------------------------------------------------------------------------------------------

async function BagianGuru({ id }: { id: number }) {
  const { a } = await muatAsesmen(String(id));
  const [butir, siswa, pengerjaan] = await Promise.all([
    prisma.asesmenSoal.findMany({ where: { asesmenId: id }, orderBy: { urutan: "asc" }, include: { soal: true } }),
    prisma.siswa.findMany({ where: { kelasId: a.kelasId }, orderBy: { nama: "asc" }, select: { id: true, nama: true, noInduk: true } }),
    prisma.pengerjaan.findMany({ where: { asesmenId: id }, include: { berkas: true } }),
  ]);
  const terkunci = pengerjaan.length > 0;
  const bank =
    a.mode === "SOAL" && !terkunci
      ? await prisma.soal.findMany({
          where: { pelajaranId: a.pelajaranId, tingkat: a.kelas.tingkat, diBank: true, asesmen: { none: { asesmenId: id } } },
          orderBy: { updatedAt: "desc" },
          take: 300,
          select: { id: true, tipe: true, pertanyaan: true, pembuat: { select: { nama: true } } },
        })
      : [];
  const per = new Map(pengerjaan.map((p) => [p.siswaId, p]));
  const totalBobot = butir.reduce((s, b) => s + b.bobot, 0);
  const now = new Date();

  return (
    <div className="flex flex-col gap-12">
      {a.mode === "SOAL" ? (
        <section aria-labelledby="h-soal">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle className="sm:flex-1">
              <span id="h-soal">
                Soal ({butir.length}
                {butir.length ? `, total bobot ${totalBobot}` : ""})
              </span>
            </SectionTitle>
            {!terkunci ? (
              <div className="mb-4 flex flex-wrap gap-2">
                <AmbilBankDialog
                  action={ambilDariBank.bind(null, id)}
                  soal={bank.map((s) => ({ id: s.id, tipe: s.tipe, pertanyaan: s.pertanyaan, pembuat: s.pembuat?.nama ?? "Tanpa nama" }))}
                />
                <SoalBaruDialog action={soalBaruUntukAsesmen.bind(null, id)} />
              </div>
            ) : null}
          </div>
          {terkunci ? (
            <p className="mb-4 rounded-md border bg-muted p-3 text-sm">
              Soal terkunci karena sudah ada siswa yang mengerjakan, agar semua siswa mendapat soal yang sama.
            </p>
          ) : null}
          {butir.length === 0 ? (
            <EmptyState title="Belum ada soal">
              Tulis soal baru atau ambil dari bank soal. Tugas baru bisa diterbitkan setelah punya soal.
            </EmptyState>
          ) : (
            <ol className="flex flex-col gap-4">
              {butir.map((b) => (
                <li key={b.soalId} className="rounded-lg border bg-card p-5">
                  <SoalIsi s={b.soal} nomor={b.urutan} />
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t pt-4">
                    <span className="text-sm text-muted-foreground">
                      {b.soal.tipe === "PG" ? "Pilihan ganda" : "Essay"}
                      {b.soal.diBank ? " · ada di bank soal" : ""}
                    </span>
                    {terkunci ? (
                      <span className="text-sm">Bobot {b.bobot}</span>
                    ) : (
                      <div className="flex flex-wrap items-end gap-2">
                        <BobotForm action={ubahBobot.bind(null, id, b.soalId)} bobot={b.bobot} />
                        <ConfirmDelete
                          action={lepasSoal.bind(null, id, b.soalId)}
                          title={`Lepas soal nomor ${b.urutan}?`}
                          description="Soal hanya dilepas dari tugas ini. Jika tersimpan di bank soal, soal tetap ada di sana."
                          triggerLabel="Lepas"
                          confirmLabel="Ya, lepas"
                        />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      <section aria-labelledby="h-kumpul">
        <SectionTitle>
          <span id="h-kumpul">
            Pengumpulan ({pengerjaan.filter((p) => p.dikumpulkan).length} dari {siswa.length})
          </span>
        </SectionTitle>
        {siswa.length === 0 ? (
          <p className="text-muted-foreground">Kelas ini belum punya siswa.</p>
        ) : (
          <TableBox>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Siswa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Nilai</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {siswa.map((s) => {
                  const p = per.get(s.id);
                  const status = p?.dikumpulkan
                    ? `Terkumpul ${formatWaktu(p.dikumpulkan)}${p.dikumpulkan > a.ditutup ? " (terlambat)" : ""}`
                    : p
                      ? now > p.batas
                        ? "Waktu habis, belum dikumpulkan"
                        : "Sedang mengerjakan"
                      : a.ditutup < now
                        ? "Tidak mengumpulkan"
                        : "Belum mulai";
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold">{s.nama}</TableCell>
                      <TableCell className={cn("text-sm", !p?.dikumpulkan && "text-muted-foreground")}>{status}</TableCell>
                      <TableCell className="tabular text-right">
                        {p?.nilai != null ? formatNilai(p.nilai) : (p?.dikumpulkan ? <span className="text-sm font-semibold">Perlu dinilai</span> : "–")}
                      </TableCell>
                      <TableCell>
                        {p ? (
                          <Button asChild size="sm" variant={p.dikumpulkan && p.nilai === null ? "default" : "outline"}>
                            <Link href={`/asesmen/${id}/pengerjaan/${p.id}`}>{p.nilai === null && p.dikumpulkan ? "Nilai" : "Lihat"}</Link>
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableBox>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

async function BagianSiswa({ id, siswaId, dibuka }: { id: number; siswaId: number | null; dibuka: boolean }) {
  const { a } = await muatAsesmen(String(id));
  const p = siswaId
    ? await prisma.pengerjaan.findUnique({
        where: { asesmenId_siswaId: { asesmenId: id, siswaId } },
        include: { berkas: true },
      })
    : null;
  const now = new Date();
  const jumlahSoal = await prisma.asesmenSoal.count({ where: { asesmenId: id } });
  const lihatHasil = p?.dikumpulkan && (a.tampilkanHasil || a.ditutup < now);

  if (a.mode === "UPLOAD") {
    return (
      <section aria-labelledby="h-jawab" className="max-w-xl">
        <SectionTitle>
          <span id="h-jawab">Jawaban Anda</span>
        </SectionTitle>
        {p?.berkas ? (
          <p className="mb-4">
            Terkumpul {formatWaktu(p.dikumpulkan!)}:{" "}
            <a href={`/berkas/${p.berkas.id}`} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">
              {p.berkas.nama}
            </a>
          </p>
        ) : null}
        {p?.nilai !== null && p?.nilai !== undefined ? (
          <div className="rounded-lg border bg-card p-4">
            <p className="text-3xl font-semibold">Nilai {formatNilai(p.nilai)}</p>
            {p.catatan ? <p className="mt-2 whitespace-pre-wrap">{p.catatan}</p> : null}
          </div>
        ) : dibuka ? (
          <KumpulBerkasForm action={kumpulkanBerkas.bind(null, id)} ada={p?.berkas ? { id: p.berkas.id, nama: p.berkas.nama } : null} />
        ) : (
          <p className="text-muted-foreground">
            {now < a.dibuka ? `Pengumpulan dibuka ${formatWaktu(a.dibuka)}.` : p ? "Menunggu dinilai guru." : "Batas waktu sudah lewat. Anda tidak mengumpulkan."}
          </p>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="h-kerja" className="max-w-2xl">
      <SectionTitle>
        <span id="h-kerja">Pengerjaan</span>
      </SectionTitle>
      {!p ? (
        dibuka ? (
          <div className="grid gap-4 rounded-lg border bg-card p-5">
            <p>
              {jumlahSoal} soal.{" "}
              {a.durasiMenit
                ? `Waktu ${formatDurasi(a.durasiMenit)} berjalan sejak Anda menekan Mulai dan tidak bisa dihentikan.`
                : `Kerjakan sebelum ${formatWaktu(a.ditutup)}.`}{" "}
              Jawaban tersimpan otomatis.
            </p>
            <TombolAksi action={mulaiKerjakan.bind(null, id)}>Mulai mengerjakan</TombolAksi>
          </div>
        ) : (
          <p className="text-muted-foreground">
            {now < a.dibuka ? `Dibuka ${formatWaktu(a.dibuka)}.` : "Waktu pengerjaan sudah ditutup. Anda tidak mengerjakan."}
          </p>
        )
      ) : !p.dikumpulkan && now <= p.batas ? (
        <div className="grid gap-4 rounded-lg border bg-card p-5">
          <p>Anda sedang mengerjakan. Sisa waktu sampai {formatWaktu(p.batas)}.</p>
          <Button asChild className="w-fit">
            <Link href={`/asesmen/${id}/kerjakan`}>Lanjutkan</Link>
          </Button>
        </div>
      ) : !p.dikumpulkan ? (
        <div className="grid gap-4 rounded-lg border bg-card p-5">
          <p>Waktu habis. Jawaban yang sudah tersimpan akan dikumpulkan.</p>
          <TombolAksi action={kumpulkan.bind(null, id)}>Kumpulkan jawaban</TombolAksi>
        </div>
      ) : (
        <div className="grid gap-2 rounded-lg border bg-card p-5">
          <p>Terkumpul {formatWaktu(p.dikumpulkan)}.</p>
          {lihatHasil ? (
            p.nilai !== null ? (
              <>
                <p className="text-3xl font-semibold">Nilai {formatNilai(p.nilai)}</p>
                <Link href={`/asesmen/${id}/hasil`} className="w-fit font-semibold underline underline-offset-4">
                  Lihat jawaban dan pembahasan
                </Link>
              </>
            ) : (
              <p>Nilai pilihan ganda sudah dihitung. Nilai akhir keluar setelah guru menilai jawaban essay.</p>
            )
          ) : (
            <p className="text-muted-foreground">Nilai ditampilkan setelah {formatWaktu(a.ditutup)}.</p>
          )}
          {p.catatan ? <p className="mt-2 whitespace-pre-wrap">Catatan guru: {p.catatan}</p> : null}
        </div>
      )}
    </section>
  );
}

/** Wali kelas looking at a subject they do not teach: progress only, no answers. */
async function BagianLihat({ id }: { id: number }) {
  const [kumpul, dinilai] = await Promise.all([
    prisma.pengerjaan.count({ where: { asesmenId: id, dikumpulkan: { not: null } } }),
    prisma.pengerjaan.aggregate({ where: { asesmenId: id, nilai: { not: null } }, _avg: { nilai: true }, _count: true }),
  ]);
  return (
    <p className="text-muted-foreground">
      {kumpul} siswa sudah mengumpulkan
      {dinilai._count ? `, rata-rata nilai ${formatNilai(dinilai._avg.nilai ?? 0)} dari ${dinilai._count} yang dinilai` : ""}.
    </p>
  );
}
