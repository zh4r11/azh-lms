"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { ADMIN } from "@/lib/access";
import { formatTanggal } from "@/lib/labels";
import { tanggalJam } from "@/lib/waktu";
import { fieldError, formValues, run, zId, zJam, zSemester, zTanggal } from "@/lib/action";

const base = z.object({
  jenis: z.enum(["UTS", "UAS", "UJIAN_SEKOLAH"], { message: "Pilih jenis ujian." }),
  semester: zSemester,
  tanggal: zTanggal("Tanggal"),
  jamMulai: zJam("Jam mulai"),
  jamSelesai: zJam("Jam selesai"),
  pelajaranId: zId("mata pelajaran"),
  ruang: z.string().max(40, "Nama ruang maksimal 40 karakter."),
  // "0" is the "belum ditentukan" option of the select.
  pengawasId: z
    .string()
    .optional()
    .transform((v) => Number(v) || null),
});

const jamUrut = (d: { jamMulai: string; jamSelesai: string }) => d.jamSelesai > d.jamMulai;
const JAM = { path: ["jamSelesai"], message: "Jam selesai harus setelah jam mulai." };

type Slot = {
  tanggal: Date;
  jamMulai: string;
  jamSelesai: string;
  kelasId: number;
  ruang: string;
  pengawasId: number | null;
};

/**
 * Refuses a slot that overlaps another exam on the same day for the same class, room, or
 * invigilator. Times are "HH:MM", so string comparison orders them correctly.
 */
async function cekBentrok(slot: Slot, kecualiId?: number) {
  const bentrok = await prisma.jadwalUjian.findMany({
    where: {
      tanggal: slot.tanggal,
      jamMulai: { lt: slot.jamSelesai },
      jamSelesai: { gt: slot.jamMulai },
      ...(kecualiId ? { NOT: { id: kecualiId } } : {}),
      OR: [
        { kelasId: slot.kelasId },
        { ruang: { equals: slot.ruang, mode: "insensitive" } },
        ...(slot.pengawasId ? [{ pengawasId: slot.pengawasId }] : []),
      ],
    },
    include: { kelas: true, pelajaran: true, pengawas: true },
    take: 1,
  });
  const b = bentrok[0];
  if (!b) return;
  const kapan = `${b.jamMulai} sampai ${b.jamSelesai}`;
  if (b.kelasId === slot.kelasId) {
    fieldError("kelasId", `Kelas ${b.kelas.nama} sudah ujian ${b.pelajaran.nama} pukul ${kapan}.`);
  }
  if (slot.pengawasId && b.pengawasId === slot.pengawasId) {
    fieldError("pengawasId", `${b.pengawas?.nama} sudah mengawas ${b.kelas.nama} pukul ${kapan}.`);
  }
  fieldError("ruang", `Ruang ${b.ruang} dipakai ${b.kelas.nama} (${b.pelajaran.nama}) pukul ${kapan}.`);
}

function revalidate() {
  revalidatePath("/ujian");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function createUjian(formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const d = base.refine(jamUrut, JAM).parse(formValues(formData));
    const kelasIds = [...new Set(formData.getAll("kelasId").map(Number).filter(Boolean))];
    if (kelasIds.length === 0) fieldError("kelasId", "Pilih minimal satu kelas.");
    if (kelasIds.length > 1 && d.ruang) {
      fieldError("ruang", "Satu ruang hanya untuk satu kelas. Kosongkan agar tiap kelas ujian di ruangnya sendiri.");
    }
    if (kelasIds.length > 1 && d.pengawasId) {
      fieldError("pengawasId", "Satu pengawas hanya untuk satu kelas. Atur pengawas tiap kelas lewat tombol Ubah.");
    }
    const kelas = await prisma.kelas.findMany({ where: { id: { in: kelasIds } } });
    const slots = kelas.map((k) => ({
      ...d,
      kelasId: k.id,
      // Without a room, a class sits the exam in its own classroom.
      ruang: d.ruang || k.nama,
    }));
    for (const s of slots) await cekBentrok(s);
    await prisma.jadwalUjian.createMany({ data: slots });
    revalidate();
    return slots.length === 1
      ? `Ujian ${kelas[0].nama} dijadwalkan ${formatTanggal(d.tanggal)}.`
      : `Ujian dijadwalkan untuk ${slots.length} kelas pada ${formatTanggal(d.tanggal)}.`;
  });
}

export async function updateUjian(id: number, formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const d = base
      .extend({ kelasId: zId("kelas") })
      .refine(jamUrut, JAM)
      .parse(formValues(formData));
    const kelas = await prisma.kelas.findUniqueOrThrow({ where: { id: d.kelasId } });
    const data = { ...d, ruang: d.ruang || kelas.nama };
    await cekBentrok(data, id);
    await prisma.jadwalUjian.update({ where: { id }, data });
    // An online exam follows its schedule.
    const dibuka = tanggalJam(data.tanggal, data.jamMulai);
    const ditutup = tanggalJam(data.tanggal, data.jamSelesai);
    await prisma.asesmen.updateMany({
      where: { jadwalUjianId: id },
      data: { dibuka, ditutup, semester: data.semester, kelasId: data.kelasId, pelajaranId: data.pelajaranId },
    });
    revalidate();
    return `Jadwal ujian ${kelas.nama} diperbarui.`;
  });
}

export async function deleteUjian(id: number) {
  return run(async () => {
    await assertRole(ADMIN);
    await prisma.jadwalUjian.delete({ where: { id } });
    revalidate();
    return "Jadwal ujian dihapus.";
  });
}
