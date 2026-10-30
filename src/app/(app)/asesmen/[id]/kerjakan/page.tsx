import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { kumpulkan, simpanJawaban } from "../../actions";
import { muatAsesmen } from "../../muat";
import { RuangUjian } from "./ruang-ujian";

export const metadata: Metadata = { title: "Mengerjakan" };

/** Same seed, same order: a student who reloads sees their own shuffled order again. */
function acak<T>(xs: T[], seed: number) {
  const out = [...xs];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default async function Kerjakan({ params }: PageProps<"/asesmen/[id]/kerjakan">) {
  const { user, a } = await muatAsesmen((await params).id);
  if (user.role !== "SISWA" || a.mode !== "SOAL" || !user.siswaId) notFound();
  const p = await prisma.pengerjaan.findUnique({
    where: { asesmenId_siswaId: { asesmenId: a.id, siswaId: user.siswaId } },
    include: { jawaban: true },
  });
  if (!p || p.dikumpulkan) redirect(`/asesmen/${a.id}`);

  const butir = await prisma.asesmenSoal.findMany({
    where: { asesmenId: a.id },
    orderBy: { urutan: "asc" },
    // Never send the key or pembahasan to the browser while the student is working.
    select: { bobot: true, soal: { select: { id: true, tipe: true, pertanyaan: true, opsi: true } } },
  });
  const urut = a.acakSoal ? acak(butir, p.id) : butir;
  const jawaban = new Map(p.jawaban.map((j) => [j.soalId, j]));

  return (
    <RuangUjian
      judul={a.judul}
      sub={`${a.pelajaran.nama} · ${a.kelas.nama}`}
      batas={p.batas.toISOString()}
      serverNow={new Date().toISOString()}
      soal={urut.map((b) => ({
        id: b.soal.id,
        tipe: b.soal.tipe,
        pertanyaan: b.soal.pertanyaan,
        opsi: b.soal.opsi,
        bobot: b.bobot,
        pilihan: jawaban.get(b.soal.id)?.pilihan ?? null,
        teks: jawaban.get(b.soal.id)?.teks ?? "",
        ragu: jawaban.get(b.soal.id)?.ragu ?? false,
      }))}
      simpan={simpanJawaban.bind(null, a.id)}
      kumpulkan={kumpulkan.bind(null, a.id)}
    />
  );
}
