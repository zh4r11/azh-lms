"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { ADMIN } from "@/lib/access";
import { formValues, run, zWajib } from "@/lib/action";

const schema = z.object({
  nama: zWajib("Nama mata pelajaran", 3),
  jumlahJam: z.coerce
    .number({ message: "Isi jumlah jam per minggu." })
    .int("Jumlah jam harus bilangan bulat.")
    .min(1, "Minimal 1 jam per minggu.")
    .max(40, "Maksimal 40 jam per minggu."),
});

const UNIQUE = "Mata pelajaran dengan nama ini sudah ada.";

export async function createPelajaran(formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const data = schema.parse(formValues(formData));
    await prisma.pelajaran.create({ data });
    revalidatePath("/pelajaran");
    return `${data.nama} ditambahkan.`;
  }, UNIQUE);
}

export async function updatePelajaran(id: number, formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const data = schema.parse(formValues(formData));
    await prisma.pelajaran.update({ where: { id }, data });
    revalidatePath("/pelajaran");
    return `${data.nama} diperbarui.`;
  }, UNIQUE);
}

export async function deletePelajaran(id: number) {
  return run(async () => {
    await assertRole(ADMIN);
    const p = await prisma.pelajaran.delete({ where: { id } });
    revalidatePath("/pelajaran");
    return `${p.nama} dihapus.`;
  });
}
