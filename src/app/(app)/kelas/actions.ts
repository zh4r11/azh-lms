"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { ADMIN } from "@/lib/access";
import { formValues, run, zWajib } from "@/lib/action";

const schema = z.object({
  nama: zWajib("Nama kelas", 2),
  tingkat: z.enum(["X", "XI", "XII"], { message: "Pilih tingkat kelas." }),
  waliKelasId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "none" ? Number(v) : null)),
});

const UNIQUE = "Kelas dengan nama ini sudah ada.";

function revalidate() {
  revalidatePath("/kelas");
  revalidatePath("/dashboard");
}

export async function createKelas(formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const data = schema.parse(formValues(formData));
    await prisma.kelas.create({ data });
    revalidate();
    return `Kelas ${data.nama} ditambahkan.`;
  }, UNIQUE);
}

export async function updateKelas(id: number, formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const data = schema.parse(formValues(formData));
    await prisma.kelas.update({ where: { id }, data });
    revalidate();
    return `Kelas ${data.nama} diperbarui.`;
  }, UNIQUE);
}

export async function deleteKelas(id: number) {
  return run(async () => {
    await assertRole(ADMIN);
    const k = await prisma.kelas.delete({ where: { id } });
    revalidate();
    return `Kelas ${k.nama} dihapus.`;
  });
}
