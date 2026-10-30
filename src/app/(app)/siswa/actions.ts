"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { ADMIN } from "@/lib/access";
import { formValues, run, zId, zJk, zTanggal, zTelp, zWajib } from "@/lib/action";

const schema = z.object({
  noInduk: zWajib("Nomor induk", 5),
  nama: zWajib("Nama siswa", 3),
  jk: zJk,
  telp: zTelp,
  kelasId: zId("kelas"),
  alamat: zWajib("Alamat"),
  tempatLahir: zWajib("Tempat lahir"),
  tanggalLahir: zTanggal("Tanggal lahir"),
});

const UNIQUE = "Nomor induk ini sudah dipakai siswa lain.";

function revalidate() {
  revalidatePath("/siswa");
  revalidatePath("/dashboard");
}

export async function createSiswa(formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const data = schema.parse(formValues(formData));
    await prisma.siswa.create({ data });
    revalidate();
    return `${data.nama} ditambahkan.`;
  }, UNIQUE);
}

export async function updateSiswa(id: number, formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const data = schema.parse(formValues(formData));
    await prisma.siswa.update({ where: { id }, data });
    revalidate();
    return `Data ${data.nama} diperbarui.`;
  }, UNIQUE);
}

export async function deleteSiswa(id: number) {
  return run(async () => {
    await assertRole(ADMIN);
    const s = await prisma.siswa.delete({ where: { id } });
    revalidate();
    return `${s.nama} dihapus.`;
  });
}
