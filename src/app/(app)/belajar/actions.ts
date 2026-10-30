"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AccessError, assertRole } from "@/lib/auth";
import { ADMIN, PENILAI } from "@/lib/access";
import { assertKelola } from "@/lib/lingkup";
import { berkasMilik, BerkasError } from "@/lib/berkas";
import { fieldError, formValues, run, zTanggal, zWajib } from "@/lib/action";

const kursusPath = (kelasId: number, pelajaranId: number) => `/belajar/${kelasId}/${pelajaranId}`;

// ---------------------------------------------------------------------------------------------
// Pertemuan

const pertemuanSchema = z.object({
  judul: zWajib("Judul pertemuan", 3),
  tanggal: zTanggal("Tanggal"),
  urutan: z.coerce
    .number({ message: "Isi nomor pertemuan." })
    .int()
    .min(1, "Nomor pertemuan mulai dari 1.")
    .max(60, "Nomor pertemuan paling besar 60."),
});

export async function createPertemuan(kelasId: number, pelajaranId: number, formData: FormData) {
  return run(async () => {
    const user = await assertRole(PENILAI);
    await assertKelola(user, kelasId, pelajaranId);
    const d = pertemuanSchema.parse(formValues(formData));
    // The teacher who opens the meeting is recorded; admin falls back to the timetable teacher.
    const guruId =
      user.guruId ??
      (await prisma.jadwal.findFirst({ where: { kelasId, pelajaranId }, select: { guruId: true } }))?.guruId ??
      null;
    await prisma.pertemuan.create({ data: { ...d, kelasId, pelajaranId, guruId } });
    revalidatePath(kursusPath(kelasId, pelajaranId));
    return `${d.judul} dibuat.`;
  });
}

async function pertemuanKelola(id: number) {
  const user = await assertRole(PENILAI);
  const p = await prisma.pertemuan.findUniqueOrThrow({ where: { id } });
  await assertKelola(user, p.kelasId, p.pelajaranId);
  return { user, p };
}

export async function updatePertemuan(id: number, formData: FormData) {
  return run(async () => {
    const { p } = await pertemuanKelola(id);
    const d = pertemuanSchema.parse(formValues(formData));
    await prisma.pertemuan.update({ where: { id }, data: d });
    revalidatePath(kursusPath(p.kelasId, p.pelajaranId), "layout");
    return `${d.judul} diperbarui.`;
  });
}

export async function deletePertemuan(id: number) {
  return run(async () => {
    const { p } = await pertemuanKelola(id);
    await prisma.pertemuan.delete({ where: { id } });
    revalidatePath(kursusPath(p.kelasId, p.pelajaranId), "layout");
    return `${p.judul}, absensi, dan materinya dihapus.`;
  });
}

// ---------------------------------------------------------------------------------------------
// Absen online

export async function bukaAbsenOnline(id: number, formData: FormData) {
  return run(async () => {
    const { p } = await pertemuanKelola(id);
    const { menit } = z
      .object({
        menit: z.coerce
          .number({ message: "Isi lama absen dibuka." })
          .int()
          .min(5, "Paling sebentar 5 menit.")
          .max(600, "Paling lama 10 jam."),
      })
      .parse(formValues(formData));
    const buka = new Date();
    await prisma.pertemuan.update({
      where: { id },
      data: { absenOnlineBuka: buka, absenOnlineTutup: new Date(buka.getTime() + menit * 60_000) },
    });
    revalidatePath(`${kursusPath(p.kelasId, p.pelajaranId)}/pertemuan/${id}`);
    return `Absen online dibuka ${menit} menit.`;
  });
}

export async function tutupAbsenOnline(id: number) {
  return run(async () => {
    const { p } = await pertemuanKelola(id);
    await prisma.pertemuan.update({ where: { id }, data: { absenOnlineTutup: new Date() } });
    revalidatePath(`${kursusPath(p.kelasId, p.pelajaranId)}/pertemuan/${id}`);
    return "Absen online ditutup.";
  });
}

/** A student marks themself present while the teacher keeps online attendance open. */
export async function absenOnline(pertemuanId: number) {
  return run(async () => {
    const user = await assertRole(["SISWA"]);
    if (!user.siswaId) throw new AccessError("Akun Anda belum terhubung ke data siswa.");
    const p = await prisma.pertemuan.findUniqueOrThrow({ where: { id: pertemuanId } });
    const siswa = await prisma.siswa.findFirst({ where: { id: user.siswaId, kelasId: p.kelasId } });
    if (!siswa) throw new AccessError("Pertemuan ini bukan untuk kelas Anda.");
    const now = new Date();
    if (!p.absenOnlineBuka || !p.absenOnlineTutup || now < p.absenOnlineBuka || now > p.absenOnlineTutup) {
      throw new AccessError("Absen online sedang tidak dibuka untuk pertemuan ini.");
    }
    const ada = await prisma.absensi.findUnique({
      where: { pertemuanId_siswaId: { pertemuanId, siswaId: siswa.id } },
    });
    // A status the teacher already set (izin, sakit, ...) is not overwritten.
    if (ada && !ada.online) return "Kehadiran Anda sudah dicatat guru.";
    await prisma.absensi.upsert({
      where: { pertemuanId_siswaId: { pertemuanId, siswaId: siswa.id } },
      update: { status: "HADIR", online: true },
      create: { pertemuanId, siswaId: siswa.id, status: "HADIR", online: true },
    });
    revalidatePath(`${kursusPath(p.kelasId, p.pelajaranId)}/pertemuan/${pertemuanId}`);
    return "Anda tercatat hadir.";
  });
}

// ---------------------------------------------------------------------------------------------
// Materi (shared by a pertemuan and by the school's default bahan ajar)

/** Accepts youtube.com/watch?v=, youtu.be/, and /shorts/ links; returns the video id. */
export async function youtubeId(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    const id =
      host === "youtu.be"
        ? u.pathname.slice(1)
        : host === "youtube.com"
          ? (u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1])
          : null;
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

const materiSchema = z.object({
  judul: zWajib("Judul materi", 3).max(120, "Judul maksimal 120 karakter."),
  deskripsi: z.string().max(500, "Keterangan maksimal 500 karakter."),
  tipe: z.enum(["DOKUMEN", "VIDEO"], { message: "Pilih jenis materi." }),
  sumber: z.enum(["berkas", "youtube"]).default("berkas"),
  berkasId: z
    .string()
    .optional()
    .transform((v) => Number(v) || null),
  url: z.string().optional(),
});

async function bacaMateri(userId: number, formData: FormData) {
  const d = materiSchema.parse(formValues(formData));
  if (d.tipe === "VIDEO" && d.sumber === "youtube") {
    const id = await youtubeId(d.url ?? "");
    if (!id) fieldError("url", "Tempel link YouTube yang valid, misalnya https://youtu.be/...");
    return { judul: d.judul, deskripsi: d.deskripsi, tipe: d.tipe, url: `https://www.youtube.com/watch?v=${id}`, berkasId: null };
  }
  if (!d.berkasId) fieldError("berkasId", d.tipe === "VIDEO" ? "Unggah videonya dulu." : "Unggah berkasnya dulu.");
  try {
    const b = await berkasMilik(userId, d.berkasId);
    const video = /^video\//.test(b!.mime);
    if (video !== (d.tipe === "VIDEO")) {
      fieldError("berkasId", d.tipe === "VIDEO" ? "Berkas ini bukan video." : "Video diunggah sebagai jenis Video.");
    }
  } catch (e) {
    if (e instanceof BerkasError) fieldError("berkasId", e.message);
    throw e;
  }
  return { judul: d.judul, deskripsi: d.deskripsi, tipe: d.tipe, url: null, berkasId: d.berkasId };
}

export async function tambahMateriPertemuan(pertemuanId: number, formData: FormData) {
  return run(async () => {
    const { user, p } = await pertemuanKelola(pertemuanId);
    const data = await bacaMateri(user.id, formData);
    await prisma.materi.create({ data: { ...data, pertemuanId } });
    revalidatePath(`${kursusPath(p.kelasId, p.pelajaranId)}`, "layout");
    return `Materi ${data.judul} ditambahkan.`;
  });
}

export async function tambahMateriBahanAjar(bahanAjarId: number, formData: FormData) {
  return run(async () => {
    const user = await assertRole(ADMIN);
    const data = await bacaMateri(user.id, formData);
    await prisma.materi.create({ data: { ...data, bahanAjarId } });
    revalidatePath("/bahan-ajar", "layout");
    revalidatePath("/belajar", "layout");
    return `Materi ${data.judul} ditambahkan ke bahan ajar.`;
  });
}

export async function hapusMateri(id: number) {
  return run(async () => {
    const user = await assertRole(PENILAI);
    const m = await prisma.materi.findUniqueOrThrow({ where: { id }, include: { pertemuan: true } });
    if (m.bahanAjarId) {
      if (user.role !== "ADMIN") throw new AccessError("Bahan ajar sekolah hanya bisa diubah admin.");
    } else if (m.pertemuan) {
      await assertKelola(user, m.pertemuan.kelasId, m.pertemuan.pelajaranId);
    }
    await prisma.materi.delete({ where: { id } });
    revalidatePath("/bahan-ajar", "layout");
    revalidatePath("/belajar", "layout");
    return `Materi ${m.judul} dihapus.`;
  });
}
