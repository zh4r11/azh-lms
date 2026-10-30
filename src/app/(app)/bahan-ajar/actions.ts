"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { ADMIN } from "@/lib/access";
import { formValues, run, zWajib } from "@/lib/action";
import type { Tingkat } from "@/generated/prisma/enums";

const schema = z.object({
  urutan: z.coerce
    .number({ message: "Isi nomor pertemuan." })
    .int()
    .min(1, "Nomor pertemuan mulai dari 1.")
    .max(60, "Nomor pertemuan paling besar 60."),
  judul: zWajib("Judul", 3).max(120, "Judul maksimal 120 karakter."),
  deskripsi: z.string().max(1000, "Ringkasan maksimal 1000 karakter."),
});

const UNIQUE = "Nomor pertemuan ini sudah punya bahan ajar. Ubah yang ada atau pakai nomor lain.";

function revalidate() {
  revalidatePath("/bahan-ajar", "layout");
  revalidatePath("/belajar", "layout");
}

export async function createBahanAjar(pelajaranId: number, tingkat: Tingkat, formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const d = schema.parse(formValues(formData));
    await prisma.bahanAjar.create({ data: { ...d, pelajaranId, tingkat } });
    revalidate();
    return `Bahan ajar pertemuan ke-${d.urutan} dibuat.`;
  }, UNIQUE);
}

export async function updateBahanAjar(id: number, formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const d = schema.parse(formValues(formData));
    await prisma.bahanAjar.update({ where: { id }, data: d });
    revalidate();
    return `Bahan ajar pertemuan ke-${d.urutan} diperbarui.`;
  }, UNIQUE);
}

export async function deleteBahanAjar(id: number) {
  return run(async () => {
    await assertRole(ADMIN);
    const b = await prisma.bahanAjar.delete({ where: { id } });
    revalidate();
    return `Bahan ajar pertemuan ke-${b.urutan} dan materinya dihapus.`;
  });
}
