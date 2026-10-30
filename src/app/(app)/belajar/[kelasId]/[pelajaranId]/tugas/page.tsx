import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JENIS_ASESMEN_LABEL, formatNilai, hariIni } from "@/lib/labels";
import { formatWaktu, keInputWaktu } from "@/lib/waktu";
import { EmptyState, SectionTitle } from "@/components/page";
import { cn } from "@/lib/utils";
import { createAsesmen } from "@/app/(app)/asesmen/actions";
import { AsesmenDialog } from "@/app/(app)/asesmen/asesmen-form";
import { muatKursus } from "../../../kursus";

export const metadata: Metadata = { title: "Tugas, kuis, ujian" };

export default async function TugasList({ params }: PageProps<"/belajar/[kelasId]/[pelajaranId]/tugas">) {
  const p = await params;
  const k = await muatKursus(p.kelasId, p.pelajaranId);
  const now = new Date();

  const [asesmen, pertemuan, jumlahSiswa] = await Promise.all([
    prisma.asesmen.findMany({
      where: { kelasId: k.kelas.id, pelajaranId: k.pelajaran.id, ...(k.kelola ? {} : { terbit: true }) },
      orderBy: { ditutup: "desc" },
      include: {
        _count: { select: { soal: true } },
        pengerjaan: {
          where: k.user.role === "SISWA" ? { siswaId: k.user.siswaId ?? -1 } : {},
          select: { dikumpulkan: true, nilai: true },
        },
      },
    }),
    k.kelola
      ? prisma.pertemuan.findMany({
          where: { kelasId: k.kelas.id, pelajaranId: k.pelajaran.id },
          orderBy: { urutan: "desc" },
          select: { id: true, urutan: true, judul: true },
        })
      : [],
    prisma.siswa.count({ where: { kelasId: k.kelas.id } }),
  ]);

  const kelompok = [
    { judul: "Sedang dibuka", rows: asesmen.filter((a) => a.dibuka <= now && a.ditutup >= now).reverse() },
    { judul: "Akan datang", rows: asesmen.filter((a) => a.dibuka > now).reverse() },
    { judul: "Sudah ditutup", rows: asesmen.filter((a) => a.ditutup < now) },
  ];

  const besok = new Date(hariIni().getTime() + 7 * 86_400_000);
  return (
    <>
      {k.kelola ? (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Ujian online dibuat dari menu Jadwal ujian, lalu muncul di sini bersama tugas dan kuis.
          </p>
          <AsesmenDialog
            baru
            action={createAsesmen.bind(null, k.kelas.id, k.pelajaran.id)}
            pertemuan={pertemuan.map((pt) => ({ value: String(pt.id), label: `Ke-${pt.urutan}: ${pt.judul}` }))}
            initial={{
              jenis: "TUGAS",
              mode: "UPLOAD",
              judul: "",
              instruksi: "",
              semester: now.getUTCMonth() >= 6 ? "GANJIL" : "GENAP",
              dibuka: keInputWaktu(now).slice(0, 14) + "00",
              ditutup: `${keInputWaktu(besok).slice(0, 10)}T23:59`,
              durasiMenit: null,
              pertemuanId: pertemuan[0]?.id ?? null,
              lampiran: null,
              acakSoal: false,
              tampilkanHasil: true,
              waktuTerkunci: false,
            }}
          />
        </div>
      ) : null}

      {asesmen.length === 0 ? (
        <EmptyState title="Belum ada tugas, kuis, atau ujian online">
          {k.kelola
            ? "Buat tugas atau kuis dengan tombolnya. Ujian online disiapkan dari jadwal ujian yang disusun admin."
            : "Tugas dari guru akan muncul di sini lengkap dengan batas waktunya."}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-10">
          {kelompok
            .filter((g) => g.rows.length)
            .map((g) => (
              <section key={g.judul} aria-labelledby={`g-${g.judul}`}>
                <SectionTitle>
                  <span id={`g-${g.judul}`}>{g.judul}</span>
                </SectionTitle>
                <ul className="divide-y rounded-lg border bg-card">
                  {g.rows.map((a) => {
                    const kumpul = a.pengerjaan.filter((x) => x.dikumpulkan).length;
                    const belumDinilai = a.pengerjaan.filter((x) => x.dikumpulkan && x.nilai === null).length;
                    const saya = k.user.role === "SISWA" ? a.pengerjaan[0] : undefined;
                    const status =
                      k.user.role === "SISWA"
                        ? saya?.dikumpulkan
                          ? saya.nilai !== null && (a.tampilkanHasil || a.ditutup < now)
                            ? `Nilai ${formatNilai(saya.nilai)}`
                            : "Terkumpul"
                          : a.ditutup < now
                            ? "Tidak dikumpulkan"
                            : "Belum dikerjakan"
                        : !a.terbit
                          ? "Draf"
                          : `${kumpul} dari ${jumlahSiswa} terkumpul${belumDinilai ? ` · ${belumDinilai} perlu dinilai` : ""}`;
                    const sorot = k.user.role === "SISWA" ? !saya?.dikumpulkan && a.ditutup >= now && a.dibuka <= now : belumDinilai > 0;
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/asesmen/${a.id}`}
                          className="group grid gap-1 p-4 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                        >
                          <span className="min-w-0">
                            <span className="block font-semibold group-hover:underline">
                              <span className="mr-2 text-sm font-normal text-muted-foreground">{JENIS_ASESMEN_LABEL[a.jenis]}</span>
                              {a.judul}
                            </span>
                            <span className="block text-sm text-muted-foreground">
                              {a.dibuka > now ? `Dibuka ${formatWaktu(a.dibuka)}` : `Batas ${formatWaktu(a.ditutup)}`} ·{" "}
                              {a.mode === "SOAL" ? `${a._count.soal} soal` : "unggah berkas"}
                              {a.durasiMenit ? ` · ${a.durasiMenit} menit` : ""}
                            </span>
                          </span>
                          <span className={cn("text-sm", sorot ? "rounded-sm bg-highlight px-2 py-0.5 font-semibold" : "text-muted-foreground")}>
                            {status}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>
      )}
    </>
  );
}
