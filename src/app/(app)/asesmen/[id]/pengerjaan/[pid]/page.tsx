import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatWaktu } from "@/lib/waktu";
import { formatNilai } from "@/lib/labels";
import { PageHeader } from "@/components/page";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { SoalIsi } from "@/components/soal-view";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { nilaiPengerjaan } from "../../../actions";
import { muatAsesmen } from "../../../muat";

export const metadata: Metadata = { title: "Penilaian" };

const HURUF = "ABCDEF";

export default async function Penilaian({ params }: PageProps<"/asesmen/[id]/pengerjaan/[pid]">) {
  const prm = await params;
  const { a, kelola } = await muatAsesmen(prm.id);
  if (!kelola) notFound();
  const p = await prisma.pengerjaan.findFirst({
    where: { id: Number(prm.pid), asesmenId: a.id },
    include: { siswa: true, berkas: true, jawaban: true },
  });
  if (!p) notFound();
  const butir =
    a.mode === "SOAL"
      ? await prisma.asesmenSoal.findMany({ where: { asesmenId: a.id }, orderBy: { urutan: "asc" }, include: { soal: true } })
      : [];
  const jawab = new Map(p.jawaban.map((j) => [j.soalId, j]));

  return (
    <>
      <PageHeader
        title={`${p.siswa.nama}, ${a.judul}`}
        mark={p.siswa.nama}
        back={{ href: `/asesmen/${a.id}`, label: a.judul }}
        description={
          p.dikumpulkan
            ? `Dikumpulkan ${formatWaktu(p.dikumpulkan)}${p.dikumpulkan > a.ditutup ? ", terlambat" : ""}. Nilai saat ini: ${p.nilai !== null ? formatNilai(p.nilai) : "belum lengkap"}.`
            : "Belum dikumpulkan."
        }
      />
      <ActionForm action={nilaiPengerjaan.bind(null, p.id)} className="gap-6">
        {a.mode === "UPLOAD" ? (
          <section className="grid max-w-xl gap-4">
            {p.berkas ? (
              <a href={`/berkas/${p.berkas.id}`} target="_blank" rel="noreferrer" className="w-fit font-semibold underline underline-offset-4">
                Buka jawaban: {p.berkas.nama}
              </a>
            ) : (
              <p className="text-muted-foreground">Siswa belum mengunggah berkas.</p>
            )}
            <Field name="nilai" label="Nilai (0 sampai 100)" className="w-48">
              <Input name="nilai" type="number" min={0} max={100} step="0.5" defaultValue={p.nilai ?? ""} />
            </Field>
          </section>
        ) : (
          <ol className="flex flex-col gap-4">
            {butir.map((b, i) => {
              const j = jawab.get(b.soalId);
              const benar = b.soal.tipe === "PG" && j?.pilihan === b.soal.kunci;
              return (
                <li key={b.soalId} className="rounded-lg border bg-card p-5">
                  <SoalIsi s={b.soal} nomor={i + 1} />
                  <div className="mt-4 grid gap-3 border-t pt-4">
                    {b.soal.tipe === "PG" ? (
                      <p className={cn("font-semibold", benar ? "text-primary" : "text-destructive")}>
                        {j?.pilihan === null || j?.pilihan === undefined
                          ? "Tidak dijawab"
                          : `Menjawab ${HURUF[j.pilihan]}, ${benar ? "benar" : "salah"}`}{" "}
                        ({benar ? b.bobot : 0} dari {b.bobot})
                      </p>
                    ) : (
                      <>
                        <div>
                          <p className="mb-1 text-sm font-semibold">Jawaban siswa</p>
                          <div className="rounded-md border bg-background p-3 whitespace-pre-wrap">
                            {j?.teks || <em className="text-muted-foreground">Tidak dijawab</em>}
                          </div>
                        </div>
                        <Field name={`skor-${b.soalId}`} label={`Skor (0 sampai ${b.bobot})`} className="w-48">
                          <Input
                            name={`skor-${b.soalId}`}
                            type="number"
                            min={0}
                            max={b.bobot}
                            step="0.5"
                            defaultValue={j?.skor !== null && j?.skor !== undefined ? Math.round(j.skor * b.bobot * 10) / 10 : ""}
                          />
                        </Field>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <Field name="catatan" label="Catatan untuk siswa" hint="Opsional. Siswa melihatnya bersama nilai." className="max-w-xl">
          <Textarea name="catatan" rows={3} defaultValue={p.catatan} />
        </Field>
        <SubmitButton className="w-fit">Simpan penilaian</SubmitButton>
      </ActionForm>
    </>
  );
}
