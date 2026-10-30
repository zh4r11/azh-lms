"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { ADMIN } from "@/lib/access";
import { formValues, run, zJk, zTelp, zWajib } from "@/lib/action";

const schema = z.object({
  noInduk: z
    .string()
    .transform((v) => v || null)
    .pipe(z.string().min(5, "NIP minimal 5 karakter.").nullable()),
  nama: zWajib("Nama guru", 3),
  jk: zJk,
  telp: zTelp,
  alamat: zWajib("Alamat"),
  pelajaranId: z.coerce.number({ message: "Pilih mata pelajaran." }).int().positive("Pilih mata pelajaran."),
});

const UNIQUE = "NIP ini sudah dipakai guru lain.";

function revalidate() {
  revalidatePath("/guru");
  revalidatePath("/dashboard");
}

export async function createGuru(formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const data = schema.parse(formValues(formData));
    await prisma.guru.create({ data });
    revalidate();
    return `${data.nama} ditambahkan.`;
  }, UNIQUE);
}

export async function updateGuru(id: number, formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const data = schema.parse(formValues(formData));
    await prisma.guru.update({ where: { id }, data });
    revalidate();
    return `Data ${data.nama} diperbarui.`;
  }, UNIQUE);
}

export async function deleteGuru(id: number) {
  return run(async () => {
    await assertRole(ADMIN);
    const g = await prisma.guru.delete({ where: { id } });
    revalidate();
    return `${g.nama} dihapus.`;
  });
}
