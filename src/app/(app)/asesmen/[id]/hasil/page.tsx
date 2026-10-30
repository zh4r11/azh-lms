import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatWaktu } from "@/lib/waktu";
import { formatNilai } from "@/lib/labels";
import { PageHeader } from "@/components/page";
import { cn } from "@/lib/utils";
import { muatAsesmen } from "../../muat";
import { TeksRumus } from "@/components/teks-rumus";

export const metadata: Metadata = { title: "Hasil" };

const HURUF = "ABCDEF";

/**
 * A student's own answers next to the key and pembahasan. Opens only after the deadline, so the
 * key cannot be passed to classmates who are still working.
 */
export default async function Hasil({ params }: PageProps<"/asesmen/[id]/hasil">) {
  const { user, a } = await muatAsesmen((await params).id);
  if (user.role !== "SISWA" || !user.siswaId || a.mode !== "SOAL") notFound();
  const p = await prisma.pengerjaan.findUnique({
    where: { asesmenId_siswaId: { asesmenId: a.id, siswaId: user.siswaId } },
    include: { jawaban: true },
  });
  if (!p?.dikumpulkan || !a.tampilkanHasil) notFound();
  const terbuka = new Date() > a.ditutup;
  const butir = terbuka
    ? await prisma.asesmenSoal.findMany({ where: { asesmenId: a.id }, orderBy: { urutan: "asc" }, include: { soal: true } })
    : [];
  const jawab = new Map(p.jawaban.map((j) => [j.soalId, j]));

  return (
    <>
      <PageHeader
        title={`Hasil ${a.judul}`}
        mark="Hasil"
        back={{ href: `/asesmen/${a.id}`, label: a.judul }}
        description={p.nilai !== null ? `Nilai ${formatNilai(p.nilai)}` : "Nilai akhir menunggu penilaian essay oleh guru."}
      />
      {!terbuka ? (
        <p className="text-muted-foreground">Jawaban benar dan pembahasan tampil setelah {formatWaktu(a.ditutup)}.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {butir.map((b, i) => {
            const j = jawab.get(b.soalId);
            const benar = b.soal.tipe === "PG" && j?.pilihan === b.soal.kunci;
            return (
              <li key={b.soalId} className="rounded-lg border bg-card p-5">
                <p className="mb-3 flex justify-between gap-4 text-sm text-muted-foreground">
                  <span>Soal {i + 1}</span>
                  <span className={cn("font-semibold", b.soal.tipe === "PG" && (benar ? "text-primary" : "text-destructive"))}>
                    {b.soal.tipe === "PG"
                      ? benar
                        ? "Benar"
                        : j?.pilihan === null || j?.pilihan === undefined
                          ? "Tidak dijawab"
                          : "Salah"
                      : j?.skor !== null && j?.skor !== undefined
                        ? `Skor ${Math.round(j.skor * b.bobot * 10) / 10} dari ${b.bobot}`
                        : "Belum dinilai"}
                  </span>
                </p>
                <p className="mb-4 whitespace-pre-wrap"><TeksRumus teks={b.soal.pertanyaan} /></p>
                {b.soal.tipe === "PG" ? (
                  <ol className="grid gap-1">
                    {b.soal.opsi.map((o, k) => (
                      <li
                        key={k}
                        className={cn(
                          "flex gap-2 rounded-md border px-3 py-2",
                          k === b.soal.kunci && "border-primary font-semibold",
                          k === j?.pilihan && k !== b.soal.kunci && "border-destructive",
                        )}
                      >
                        <span className="w-4 shrink-0">{HURUF[k]}.</span>
                        <span className="min-w-0 flex-1 break-words"><TeksRumus teks={o} /></span>
                        <span className="shrink-0 text-sm">
                          {k === b.soal.kunci ? "Jawaban benar" : k === j?.pilihan ? "Jawaban Anda" : ""}
                          {k === b.soal.kunci && k === j?.pilihan ? ", jawaban Anda" : ""}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="rounded-md border bg-background p-3 whitespace-pre-wrap">{j?.teks || <em className="text-muted-foreground">Tidak dijawab</em>}</div>
                )}
                {b.soal.tipe === "PG" && b.soal.pembahasan ? (
                  <div className="mt-4 border-t pt-3">
                    <p className="text-sm font-semibold">Pembahasan</p>
                    <p className="whitespace-pre-wrap"><TeksRumus teks={b.soal.pembahasan} /></p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
