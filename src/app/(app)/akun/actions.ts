"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AccessError, assertRole } from "@/lib/auth";
import { ADMIN } from "@/lib/access";
import { fieldError, formValues, run, zWajib } from "@/lib/action";

const base = z.object({
  name: zWajib("Nama", 3),
  email: z
    .string()
    .email("Tulis email yang valid.")
    .transform((v) => v.toLowerCase()),
  role: z.enum(["ADMIN", "GURU", "WALI_KELAS", "SISWA"], { message: "Pilih peran." }),
  siswaNoInduk: z.string().optional(),
  guruId: z.string().optional(),
});

type Data = z.infer<typeof base>;

/**
 * Resolves which siswa or guru record the account belongs to. Siswa accounts must be linked,
 * because the rapor page shows a student only their own record. Other roles drop the link.
 */
async function tautan(data: Data, userId?: number) {
  const bukanSaya = userId ? { NOT: { id: userId } } : {};
  if (data.role === "SISWA") {
    const noInduk = data.siswaNoInduk ?? "";
    if (!noInduk) fieldError("siswaNoInduk", "Isi nomor induk siswa pemilik akun.");
    const siswa = await prisma.siswa.findUnique({ where: { noInduk }, select: { id: true, nama: true } });
    if (!siswa) fieldError("siswaNoInduk", `Nomor induk ${noInduk} tidak ada di Data siswa.`);
    const lain = await prisma.user.findFirst({ where: { siswaId: siswa.id, ...bukanSaya } });
    if (lain) fieldError("siswaNoInduk", `${siswa.nama} sudah punya akun (${lain.email}).`);
    return { siswaId: siswa.id, guruId: null };
  }
  if (data.role === "GURU" || data.role === "WALI_KELAS") {
    const guruId = Number(data.guruId) || null;
    if (guruId) {
      const lain = await prisma.user.findFirst({ where: { guruId, ...bukanSaya } });
      if (lain) fieldError("guruId", `Data guru ini sudah dipakai akun ${lain.email}.`);
    }
    return { siswaId: null, guruId };
  }
  return { siswaId: null, guruId: null };
}

const password = z.string().min(7, "Password minimal 7 karakter.");

const UNIQUE = "Email ini sudah dipakai akun lain.";

export async function createAkun(formData: FormData) {
  return run(async () => {
    await assertRole(ADMIN);
    const data = base.extend({ password }).parse(formValues(formData));
    const link = await tautan(data);
    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        ...link,
        passwordHash: await bcrypt.hash(data.password, 10),
      },
    });
    revalidatePath("/akun");
    return `Akun ${data.email} dibuat.`;
  }, UNIQUE);
}

export async function updateAkun(id: number, formData: FormData) {
  return run(async () => {
    const me = await assertRole(ADMIN);
    // Empty password means "keep the current one".
    const data = base
      .extend({ password: z.union([z.literal(""), password]) })
      .parse(formValues(formData));
    if (me.id === id && data.role !== "ADMIN") {
      throw new AccessError("Anda tidak bisa mencabut peran admin dari akun sendiri.");
    }
    const link = await tautan(data, id);
    await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        ...link,
        ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {}),
      },
    });
    revalidatePath("/akun");
    return `Akun ${data.email} diperbarui.`;
  }, UNIQUE);
}

export async function deleteAkun(id: number) {
  return run(async () => {
    const me = await assertRole(ADMIN);
    if (me.id === id) throw new AccessError("Anda tidak bisa menghapus akun yang sedang dipakai.");
    const u = await prisma.user.delete({ where: { id } });
    revalidatePath("/akun");
    return `Akun ${u.email} dihapus.`;
  });
}
