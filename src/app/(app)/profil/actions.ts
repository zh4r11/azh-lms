"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { formValues, run, zWajib } from "@/lib/action";

export async function updateProfil(formData: FormData) {
  return run(async () => {
    const me = await assertRole();
    const data = z
      .object({
        name: zWajib("Nama", 3),
        email: z.string().email("Tulis email yang valid.").transform((v) => v.toLowerCase()),
      })
      .parse(formValues(formData));
    await prisma.user.update({ where: { id: me.id }, data });
    revalidatePath("/", "layout");
    return "Profil disimpan.";
  }, "Email ini sudah dipakai akun lain.");
}

export async function updatePassword(formData: FormData) {
  return run(async () => {
    const me = await assertRole();
    const data = z
      .object({
        current: z.string().min(1, "Isi password yang sekarang."),
        next: z.string().min(7, "Password baru minimal 7 karakter."),
        confirm: z.string(),
      })
      .refine((d) => d.next === d.confirm, {
        path: ["confirm"],
        message: "Ulangi password baru dengan sama persis.",
      })
      .parse(formValues(formData));

    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await bcrypt.compare(data.current, user.passwordHash))) {
      throw new z.ZodError([
        { code: "custom", path: ["current"], message: "Password sekarang tidak cocok.", input: "" },
      ]);
    }
    await prisma.user.update({
      where: { id: me.id },
      data: { passwordHash: await bcrypt.hash(data.next, 10) },
    });
    return "Password diganti. Pakai password baru saat masuk berikutnya.";
  });
}
