"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { ADMIN } from "@/lib/access";
import { HARI_LABEL } from "@/lib/labels";
import { formValues, run, zId, zJam } from "@/lib/action";

const schema = z
  .object({
    hari: z.enum(["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"], { message: "Pilih hari." }),
    jamMulai: zJam("Jam mulai"),
    jamSelesai: zJam("Jam selesai"),
    pelajaranId: zId("mata pelajaran"),
    guruId: z
      .string()
      .optional()
      .transform((v) => (v && v !== "none" ? Number(v) : null)),
  })
  .refine((d) => d.jamSelesai > d.jamMulai, {
    path: ["jamSelesai"],
    message: "Jam selesai harus setelah jam mulai.",
  });

type Slot = z.infer<typeof schema>;

/** Rejects a slot that overlaps another in the same class, or the same teacher elsewhere. */
async function assertNoClash(kelasId: number, slot: Slot, ignoreId?: number) {
  const overlap = {
    hari: slot.hari,
    jamMulai: { lt: slot.jamSelesai },
    jamSelesai: { gt: slot.jamMulai },
    NOT: ignoreId ? { id: ignoreId } : undefined,
  };
  const inKelas = await prisma.jadwal.findFirst({
    where: { ...overlap, kelasId },
    include: { pelajaran: true },
  });
  if (inKelas) {
    throw fieldError(
      "jamMulai",
      `Bentrok dengan ${inKelas.pelajaran.nama} (${inKelas.jamMulai} sampai ${inKelas.jamSelesai}) di kelas ini.`,
    );
  }
  if (slot.guruId) {
    const forGuru = await prisma.jadwal.findFirst({
      where: { ...overlap, guruId: slot.guruId },
      include: { kelas: true },
    });
    if (forGuru) {
      throw fieldError(
        "guruId",
        `Guru ini sudah mengajar di ${forGuru.kelas.nama} pada ${HARI_LABEL[slot.hari]} ${forGuru.jamMulai} sampai ${forGuru.jamSelesai}.`,
      );
    }
  }
}

function fieldError(path: string, message: string) {
  return new z.ZodError([{ code: "custom", path: [path], message, input: "" }]);
}

export async function createJadwal(kelasId: number, formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const data = schema.parse(formValues(formData));
    await assertNoClash(kelasId, data);
    await prisma.jadwal.create({ data: { ...data, kelasId } });
    revalidatePath(`/jadwal/${kelasId}`);
    return "Slot jadwal ditambahkan.";
  });
}

export async function updateJadwal(id: number, kelasId: number, formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const data = schema.parse(formValues(formData));
    await assertNoClash(kelasId, data, id);
    await prisma.jadwal.update({ where: { id }, data });
    revalidatePath(`/jadwal/${kelasId}`);
    return "Slot jadwal diperbarui.";
  });
}

export async function deleteJadwal(id: number) {
  return run(async () => {
    await assertRole(ADMIN);
    const j = await prisma.jadwal.delete({ where: { id } });
    revalidatePath(`/jadwal/${j.kelasId}`);
    return "Slot jadwal dihapus.";
  });
}
