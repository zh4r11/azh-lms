"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import { formValues, run } from "@/lib/action";

const schema = z.object({
  email: z.string().email("Tulis email yang valid, misalnya nama@sekolah.sch.id."),
  password: z.string().min(1, "Password wajib diisi."),
});

export async function login(formData: FormData) {
  let ok = false;
  const result = await run(async () => {
    const data = schema.parse(formValues(formData));
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    const valid = user ? await bcrypt.compare(data.password, user.passwordHash) : false;
    if (!user || !valid) {
      throw new z.ZodError([
        { code: "custom", path: ["password"], message: "Email atau password tidak cocok.", input: "" },
      ]);
    }
    await createSession({ userId: user.id, role: user.role });
    ok = true;
    return "Berhasil masuk.";
  });
  if (ok) redirect("/");
  return result;
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
