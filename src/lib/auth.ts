import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
import type { Role } from "@/generated/prisma/enums";

export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, siswaId: true, guruId: true },
  });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** For pages: sends anyone without access back to the home page, like the old middleware did. */
export async function requireRole(roles?: readonly Role[]) {
  const user = await getCurrentUser();
  // A valid cookie for a deleted account would loop between / and /login, so clear it first.
  if (!user) redirect("/keluar");
  if (roles && !roles.includes(user.role)) redirect("/");
  return user;
}

/** For server actions: throws instead of redirecting, so the form can show the message. */
export async function assertRole(roles?: readonly Role[]) {
  const user = await getCurrentUser();
  if (!user) throw new AccessError("Sesi berakhir. Silakan masuk lagi.");
  if (roles && !roles.includes(user.role)) {
    throw new AccessError("Akun Anda tidak punya akses untuk tindakan ini.");
  }
  return user;
}

export class AccessError extends Error {}
