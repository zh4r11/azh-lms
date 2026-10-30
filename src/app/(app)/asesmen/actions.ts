"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AccessError, assertRole } from "@/lib/auth";
import { PENILAI } from "@/lib/access";
import { assertKelola } from "@/lib/lingkup";
import { berkasMilik, BerkasError } from "@/lib/berkas";
import { formatNilai, predikatNilai } from "@/lib/labels";
import { dariInputWaktu, tanggalJam } from "@/lib/waktu";
import { fieldError, formValues, run, zSemester, zWajib } from "@/lib/action";
import type { ActionResult } from "@/lib/action-result";

const zWaktu = (label: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, `${label} wajib diisi.`)
    .transform(dariInputWaktu);

const pengaturan = z
  .object({
    judul: zWajib("Judul", 3).max(150, "Judul maksimal 150 karakter."),
    instruksi: z.string().max(4000, "Instruksi maksimal 4000 karakter."),
    semester: zSemester,
    dibuka: zWaktu("Waktu dibuka"),
    ditutup: zWaktu("Batas waktu"),
    durasiMenit: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .pipe(z.number().int().min(1, "Durasi minimal 1 menit.").max(600, "Durasi maksimal 600 menit.").nullable()),
    pertemuanId: z
      .string()
      .optional()
      .transform((v) => Number(v) || null),
    lampiranId: z
      .string()
      .optional()
      .transform((v) => Number(v) || null),
    acakSoal: z.string().optional().transform((v) => v === "ya"),
    tampilkanHasil: z.string().optional().transform((v) => v === "ya"),
  })
  .refine((d) => d.ditutup > d.dibuka, { path: ["ditutup"], message: "Batas waktu harus setelah waktu dibuka." });

async function cekLampiran(userId: number, lampiranId: number | null, lamaId?: number | null) {
  if (!lampiranId || lampiranId === lamaId) return;
  try {
    await berkasMilik(userId, lampiranId);
  } catch (e) {
    if (e instanceof BerkasError) fieldError("lampiranId", e.message);
    throw e;
  }
}

export async function createAsesmen(kelasId: number, pelajaranId: number, formData: FormData) {
  return run(async () => {
    const user = await assertRole(PENILAI);
    await assertKelola(user, kelasId, pelajaranId);
    const { jenis, mode } = z
      .object({
        jenis: z.enum(["TUGAS", "KUIS"], { message: "Pilih jenis." }),
        mode: z.enum(["SOAL", "UPLOAD"], { message: "Pilih cara mengerjakan." }),
      })
      .parse(formValues(formData));
    const d = pengaturan.parse(formValues(formData));
    await cekLampiran(user.id, d.lampiranId);
    if (d.pertemuanId) {
      const ok = await prisma.pertemuan.findFirst({ where: { id: d.pertemuanId, kelasId, pelajaranId } });
      if (!ok) fieldError("pertemuanId", "Pertemuan tidak ditemukan di kelas belajar ini.");
    }
    const a = await prisma.asesmen.create({
      data: { ...d, jenis, mode, kelasId, pelajaranId, guruId: user.guruId, durasiMenit: mode === "SOAL" ? d.durasiMenit : null },
    });
    revalidatePath(`/belajar/${kelasId}/${pelajaranId}`, "layout");
    redirect(`/asesmen/${a.id}`);
  });
}

async function asesmenKelola(id: number) {
  const user = await assertRole(PENILAI);
  const a = await prisma.asesmen.findUniqueOrThrow({ where: { id } });
  await assertKelola(user, a.kelasId, a.pelajaranId);
  return { user, a };
}

function revalidateAsesmen(a: { id: number; kelasId: number; pelajaranId: number }) {
  revalidatePath(`/asesmen/${a.id}`, "layout");
  revalidatePath(`/belajar/${a.kelasId}/${a.pelajaranId}`, "layout");
  revalidatePath("/belajar");
}

export async function updateAsesmen(id: number, formData: FormData) {
  return run(async () => {
    const { user, a } = await asesmenKelola(id);
    const d = pengaturan.parse(formValues(formData));
    await cekLampiran(user.id, d.lampiranId, a.lampiranId);
    // An online ujian keeps the times the admin scheduled.
    const waktu = a.jadwalUjianId ? {} : { dibuka: d.dibuka, ditutup: d.ditutup };
    await prisma.asesmen.update({
      where: { id },
      data: { ...d, ...waktu, durasiMenit: a.mode === "SOAL" ? d.durasiMenit : null },
    });
    revalidateAsesmen(a);
    return "Pengaturan disimpan.";
  });
}

export async function setTerbit(id: number, terbit: boolean) {
  return run(async () => {
    const { a } = await asesmenKelola(id);
    if (terbit && a.mode === "SOAL" && !(await prisma.asesmenSoal.count({ where: { asesmenId: id } }))) {
      throw new AccessError("Tambahkan paling sedikit satu soal sebelum diterbitkan.");
    }
    await prisma.asesmen.update({ where: { id }, data: { terbit } });
    revalidateAsesmen(a);
    return terbit ? "Diterbitkan. Siswa sekarang bisa melihatnya." : "Ditarik kembali menjadi draf.";
  });
}

export async function deleteAsesmen(id: number) {
  return run(async () => {
    const { a } = await asesmenKelola(id);
    await prisma.asesmen.delete({ where: { id } });
    revalidateAsesmen(a);
    redirect(`/belajar/${a.kelasId}/${a.pelajaranId}/tugas`);
  });
}

/** The subject teacher turns an admin-scheduled exam into an online one. */
export async function siapkanUjianOnline(jadwalUjianId: number, formData: FormData) {
  return run(async () => {
    const user = await assertRole(PENILAI);
    const j = await prisma.jadwalUjian.findUniqueOrThrow({
      where: { id: jadwalUjianId },
      include: { pelajaran: true, kelas: true, asesmen: true },
    });
    await assertKelola(user, j.kelasId, j.pelajaranId);
    if (j.asesmen) redirect(`/asesmen/${j.asesmen.id}`);
    const { mode } = z.object({ mode: z.enum(["SOAL", "UPLOAD"], { message: "Pilih bentuk ujian." }) }).parse(formValues(formData));
    const dibuka = tanggalJam(j.tanggal, j.jamMulai);
    const ditutup = tanggalJam(j.tanggal, j.jamSelesai);
    const a = await prisma.asesmen.create({
      data: {
        jenis: "UJIAN",
        mode,
        judul: `${j.jenis === "UJIAN_SEKOLAH" ? "Ujian Sekolah" : j.jenis} ${j.pelajaran.nama}`,
        semester: j.semester,
        kelasId: j.kelasId,
        pelajaranId: j.pelajaranId,
        guruId: user.guruId,
        jadwalUjianId: j.id,
        dibuka,
        ditutup,
        durasiMenit: mode === "SOAL" ? Math.round((ditutup.getTime() - dibuka.getTime()) / 60_000) : null,
        tampilkanHasil: false,
      },
    });
    revalidatePath("/ujian");
    redirect(`/asesmen/${a.id}`);
  });
}

// ---------------------------------------------------------------------------------------------
// Student work

/** Grace for the last autosave in flight when the timer hits zero. */
const TOLERANSI_MS = 30_000;

async function asesmenSiswa(asesmenId: number) {
  const user = await assertRole(["SISWA"]);
  if (!user.siswaId) throw new AccessError("Akun Anda belum terhubung ke data siswa.");
  const a = await prisma.asesmen.findUniqueOrThrow({ where: { id: asesmenId } });
  const siswa = await prisma.siswa.findFirst({ where: { id: user.siswaId, kelasId: a.kelasId } });
  if (!siswa || !a.terbit) throw new AccessError("Tugas ini bukan untuk kelas Anda.");
  return { siswaId: siswa.id, a };
}

export async function mulaiKerjakan(asesmenId: number) {
  return run(async () => {
    const { siswaId, a } = await asesmenSiswa(asesmenId);
    const now = new Date();
    const ada = await prisma.pengerjaan.findUnique({ where: { asesmenId_siswaId: { asesmenId, siswaId } } });
    if (!ada) {
      if (now < a.dibuka) throw new AccessError("Belum dibuka.");
      if (now > a.ditutup) throw new AccessError("Waktu pengerjaan sudah ditutup.");
      const batas =
        a.durasiMenit && a.mode === "SOAL"
          ? new Date(Math.min(now.getTime() + a.durasiMenit * 60_000, a.ditutup.getTime()))
          : a.ditutup;
      await prisma.pengerjaan.create({ data: { asesmenId, siswaId, mulai: now, batas } });
    }
    redirect(`/asesmen/${asesmenId}/kerjakan`);
  });
}

async function pengerjaanAktif(asesmenId: number) {
  const { siswaId, a } = await asesmenSiswa(asesmenId);
  const p = await prisma.pengerjaan.findUnique({ where: { asesmenId_siswaId: { asesmenId, siswaId } } });
  if (!p) throw new AccessError("Mulai mengerjakan dulu.");
  return { a, p, habis: Date.now() > p.batas.getTime() + TOLERANSI_MS };
}

/** Autosave of one answer, called as the student works. */
export async function simpanJawaban(
  asesmenId: number,
  soalId: number,
  jawaban: { pilihan?: number | null; teks?: string | null; ragu?: boolean },
): Promise<ActionResult> {
  return run(async () => {
    const { p, habis } = await pengerjaanAktif(asesmenId);
    if (p.dikumpulkan) throw new AccessError("Jawaban sudah dikumpulkan.");
    if (habis) throw new AccessError("Waktu habis. Jawaban terakhir tidak tersimpan.");
    const ada = await prisma.asesmenSoal.findUnique({ where: { asesmenId_soalId: { asesmenId, soalId } } });
    if (!ada) throw new AccessError("Soal tidak ada di tugas ini.");
    const data = {
      ...(jawaban.pilihan !== undefined ? { pilihan: jawaban.pilihan } : {}),
      ...(jawaban.teks !== undefined ? { teks: jawaban.teks?.slice(0, 10000) ?? null } : {}),
      ...(jawaban.ragu !== undefined ? { ragu: jawaban.ragu } : {}),
    };
    await prisma.jawaban.upsert({
      where: { pengerjaanId_soalId: { pengerjaanId: p.id, soalId } },
      update: data,
      create: { pengerjaanId: p.id, soalId, ...data },
    });
    return "Tersimpan";
  });
}

/** Scores PG answers; the grade is final only when there is no essay left for the teacher. */
async function hitungNilai(pengerjaanId: number, asesmenId: number) {
  const [butir, jawaban] = await Promise.all([
    prisma.asesmenSoal.findMany({ where: { asesmenId }, include: { soal: true } }),
    prisma.jawaban.findMany({ where: { pengerjaanId } }),
  ]);
  const per = new Map(jawaban.map((j) => [j.soalId, j]));
  const updates = [];
  let total = 0;
  let poin = 0;
  let lengkap = true;
  for (const b of butir) {
    total += b.bobot;
    const j = per.get(b.soalId);
    if (b.soal.tipe === "PG") {
      const skor = j?.pilihan !== null && j?.pilihan !== undefined && j.pilihan === b.soal.kunci ? 1 : 0;
      poin += skor * b.bobot;
      updates.push(
        prisma.jawaban.upsert({
          where: { pengerjaanId_soalId: { pengerjaanId, soalId: b.soalId } },
          update: { skor },
          create: { pengerjaanId, soalId: b.soalId, skor },
        }),
      );
    } else if (j?.skor === null || j?.skor === undefined) {
      // An empty essay scores 0 without waiting for the teacher.
      if (!j?.teks?.trim()) {
        updates.push(
          prisma.jawaban.upsert({
            where: { pengerjaanId_soalId: { pengerjaanId, soalId: b.soalId } },
            update: { skor: 0 },
            create: { pengerjaanId, soalId: b.soalId, skor: 0 },
          }),
        );
      } else lengkap = false;
    } else poin += j.skor * b.bobot;
  }
  const nilai = lengkap && total ? Math.round((poin / total) * 1000) / 10 : null;
  await prisma.$transaction([...updates, prisma.pengerjaan.update({ where: { id: pengerjaanId }, data: { nilai } })]);
  return nilai;
}

export async function kumpulkan(asesmenId: number) {
  return run(async () => {
    const { a, p } = await pengerjaanAktif(asesmenId);
    if (!p.dikumpulkan) {
      await prisma.pengerjaan.update({ where: { id: p.id }, data: { dikumpulkan: new Date() } });
      if (a.mode === "SOAL") await hitungNilai(p.id, asesmenId);
    }
    revalidatePath(`/asesmen/${asesmenId}`, "layout");
    redirect(`/asesmen/${asesmenId}`);
  });
}

/** UPLOAD mode: hand in (or replace) the answer file before the deadline. */
export async function kumpulkanBerkas(asesmenId: number, formData: FormData) {
  return run(async () => {
    const user = await assertRole(["SISWA"]);
    const { siswaId, a } = await asesmenSiswa(asesmenId);
    if (a.mode !== "UPLOAD") throw new AccessError("Tugas ini dikerjakan dengan menjawab soal.");
    const now = new Date();
    if (now < a.dibuka) throw new AccessError("Belum dibuka.");
    if (now.getTime() > a.ditutup.getTime() + TOLERANSI_MS) throw new AccessError("Batas waktu sudah lewat.");
    const berkasId = Number(formData.get("berkasId")) || null;
    if (!berkasId) fieldError("berkasId", "Unggah berkas jawaban dulu.");
    try {
      await berkasMilik(user.id, berkasId);
    } catch (e) {
      if (e instanceof BerkasError) fieldError("berkasId", e.message);
      throw e;
    }
    const ada = await prisma.pengerjaan.findUnique({ where: { asesmenId_siswaId: { asesmenId, siswaId } } });
    if (ada?.nilai !== null && ada?.nilai !== undefined) throw new AccessError("Jawaban sudah dinilai guru, tidak bisa diganti.");
    await prisma.pengerjaan.upsert({
      where: { asesmenId_siswaId: { asesmenId, siswaId } },
      update: { berkasId, dikumpulkan: now },
      create: { asesmenId, siswaId, mulai: now, batas: a.ditutup, berkasId, dikumpulkan: now },
    });
    revalidatePath(`/asesmen/${asesmenId}`, "layout");
    return ada ? "Berkas jawaban diganti." : "Jawaban terkumpul.";
  });
}

// ---------------------------------------------------------------------------------------------
// Grading

export async function nilaiPengerjaan(pengerjaanId: number, formData: FormData) {
  return run(async () => {
    const user = await assertRole(PENILAI);
    const p = await prisma.pengerjaan.findUniqueOrThrow({ where: { id: pengerjaanId }, include: { asesmen: true, siswa: true } });
    await assertKelola(user, p.asesmen.kelasId, p.asesmen.pelajaranId);
    const v = formValues(formData);
    const catatan = (v.catatan ?? "").slice(0, 2000);

    if (p.asesmen.mode === "UPLOAD") {
      const { nilai } = z
        .object({ nilai: z.coerce.number({ message: "Isi nilai 0 sampai 100." }).min(0, "Nilai paling kecil 0.").max(100, "Nilai paling besar 100.") })
        .parse(v);
      await prisma.pengerjaan.update({ where: { id: pengerjaanId }, data: { nilai, catatan } });
    } else {
      const essay = await prisma.asesmenSoal.findMany({
        where: { asesmenId: p.asesmenId, soal: { tipe: "ESSAY" } },
        select: { soalId: true, bobot: true },
      });
      const tulis = [];
      for (const e of essay) {
        const raw = v[`skor-${e.soalId}`];
        if (raw === undefined || raw === "") continue;
        const poin = Number(raw);
        if (!Number.isFinite(poin) || poin < 0 || poin > e.bobot) fieldError(`skor-${e.soalId}`, `Isi 0 sampai ${e.bobot}.`);
        tulis.push(
          prisma.jawaban.upsert({
            where: { pengerjaanId_soalId: { pengerjaanId, soalId: e.soalId } },
            update: { skor: poin / e.bobot },
            create: { pengerjaanId, soalId: e.soalId, skor: poin / e.bobot },
          }),
        );
      }
      await prisma.$transaction([...tulis, prisma.pengerjaan.update({ where: { id: pengerjaanId }, data: { catatan } })]);
      const nilai = await hitungNilai(pengerjaanId, p.asesmenId);
      revalidatePath(`/asesmen/${p.asesmenId}`, "layout");
      return nilai === null ? "Skor disimpan. Masih ada essay yang belum dinilai." : `Nilai ${p.siswa.nama}: ${formatNilai(nilai)}.`;
    }
    revalidatePath(`/asesmen/${p.asesmenId}`, "layout");
    return `Nilai ${p.siswa.nama} disimpan.`;
  });
}

// ---------------------------------------------------------------------------------------------
// Rapor

const bobotSchema = z
  .object({
    tugas: z.coerce.number().int().min(0, "Bobot tidak boleh negatif.").max(100),
    kuis: z.coerce.number().int().min(0, "Bobot tidak boleh negatif.").max(100),
    ujian: z.coerce.number().int().min(0, "Bobot tidak boleh negatif.").max(100),
    semester: zSemester,
  })
  .refine((d) => d.tugas + d.kuis + d.ujian === 100, { path: ["ujian"], message: "Jumlah ketiga bobot harus 100." });

/**
 * Saves the weights and writes each student's rapor grade: the weighted mean of their tugas,
 * kuis, and ujian averages. Work not handed in counts as 0; a category with nothing assigned
 * yet is left out and the other weights are scaled up.
 */
export async function hitungKeRapor(kelasId: number, pelajaranId: number, formData: FormData) {
  return run(async () => {
    const user = await assertRole(PENILAI);
    await assertKelola(user, kelasId, pelajaranId);
    const b = bobotSchema.parse(formValues(formData));
    await prisma.bobotNilai.upsert({
      where: { kelasId_pelajaranId_semester: { kelasId, pelajaranId, semester: b.semester } },
      update: { tugas: b.tugas, kuis: b.kuis, ujian: b.ujian },
      create: { kelasId, pelajaranId, semester: b.semester, tugas: b.tugas, kuis: b.kuis, ujian: b.ujian },
    });

    const [siswa, asesmen, pelajaran] = await Promise.all([
      prisma.siswa.findMany({ where: { kelasId }, select: { id: true } }),
      prisma.asesmen.findMany({
        where: { kelasId, pelajaranId, semester: b.semester, terbit: true, ditutup: { lte: new Date() } },
        include: { pengerjaan: { select: { siswaId: true, nilai: true, dikumpulkan: true } } },
      }),
      prisma.pelajaran.findUniqueOrThrow({ where: { id: pelajaranId } }),
    ]);
    if (!asesmen.length) throw new AccessError("Belum ada tugas, kuis, atau ujian yang sudah ditutup di semester ini.");
    const belumDinilai = asesmen.flatMap((a) => a.pengerjaan).filter((p) => p.dikumpulkan && p.nilai === null).length;
    if (belumDinilai) {
      throw new AccessError(`Masih ada ${belumDinilai} jawaban yang belum dinilai. Nilai dulu agar tidak terhitung 0.`);
    }
    const guruId =
      user.guruId ?? (await prisma.jadwal.findFirst({ where: { kelasId, pelajaranId }, select: { guruId: true } }))?.guruId ?? null;

    const tulis = siswa.map((s) => {
      let poin = 0;
      let berat = 0;
      for (const jenis of ["TUGAS", "KUIS", "UJIAN"] as const) {
        const daftar = asesmen.filter((a) => a.jenis === jenis);
        const w = jenis === "TUGAS" ? b.tugas : jenis === "KUIS" ? b.kuis : b.ujian;
        if (!daftar.length || !w) continue;
        const rata =
          daftar.reduce((sum, a) => sum + (a.pengerjaan.find((p) => p.siswaId === s.id)?.nilai ?? 0), 0) / daftar.length;
        poin += rata * w;
        berat += w;
      }
      const nilai = Math.round(berat ? poin / berat : 0);
      const predikat = predikatNilai(nilai);
      const kata = nilai >= 92 ? "sangat baik" : nilai >= 83 ? "baik" : nilai >= 75 ? "cukup" : "perlu bimbingan";
      const key = { siswaId: s.id, pelajaranId, semester: b.semester };
      return prisma.nilai.upsert({
        where: { siswaId_pelajaranId_semester: key },
        // Descriptions a teacher already wrote are kept; only the number and predikat change.
        update: { nilai, predikat, kelasId, guruId },
        create: {
          ...key,
          kelasId,
          guruId,
          nilai,
          predikat,
          deskPengetahuan: `Pemahaman materi ${pelajaran.nama} ${kata}.`,
          deskKeterampilan: `Keterampilan menerapkan materi ${pelajaran.nama} ${kata}.`,
        },
      });
    });
    await prisma.$transaction(tulis);
    revalidatePath(`/belajar/${kelasId}/${pelajaranId}/nilai`);
    revalidatePath("/rapor");
    revalidatePath(`/nilai/ujian/${kelasId}`);
    return `Nilai rapor ${siswa.length} siswa dihitung dari ${asesmen.length} tugas, kuis, dan ujian.`;
  });
}
