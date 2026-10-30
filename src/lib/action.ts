import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { AccessError } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";

export type { ActionResult };

export function formValues(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v.trim();
  return out;
}

/**
 * Wraps a server action body so the form always gets a message back instead of a crash:
 * validation errors per field, access errors, and unique-constraint clashes.
 */
export async function run(
  body: () => Promise<string>,
  uniqueMessage = "Data dengan nilai yang sama sudah ada.",
): Promise<ActionResult> {
  try {
    const message = await body();
    return { ok: true, message };
  } catch (e) {
    // Let redirect() and notFound() from an action body reach Next.js.
    unstable_rethrow(e);
    if (e instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of e.issues) {
        const key = String(issue.path[0] ?? "form");
        fieldErrors[key] ??= issue.message;
      }
      return { ok: false, error: "Periksa lagi isian yang ditandai.", fieldErrors };
    }
    if (e instanceof AccessError) return { ok: false, error: e.message };
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return { ok: false, error: uniqueMessage };
      if (e.code === "P2025") return { ok: false, error: "Data ini sudah tidak ada. Muat ulang halaman." };
    }
    console.error(e);
    return { ok: false, error: "Gagal menyimpan karena kesalahan server. Coba lagi sebentar lagi." };
  }
}

/** Reports a check that needs the database (not zod) as an error on one field. */
export function fieldError(field: string, message: string): never {
  throw new z.ZodError([{ code: "custom", path: [field], message, input: undefined }]);
}

// Shared zod pieces with Indonesian messages.
export const zWajib = (label: string, min = 1) =>
  z.string().min(min, min > 1 ? `${label} minimal ${min} karakter.` : `${label} wajib diisi.`);

export const zId = (label: string) =>
  z.coerce.number({ message: `Pilih ${label}.` }).int().positive(`Pilih ${label}.`);

export const zTanggal = (label: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} wajib diisi.`)
    .transform((v) => new Date(`${v}T00:00:00.000Z`));

export const zJam = (label: string) => z.string().regex(/^\d{2}:\d{2}$/, `${label} wajib diisi.`);

export const zSemester = z.enum(["GANJIL", "GENAP"], { message: "Pilih semester." });
export const zJk = z.enum(["PRIA", "WANITA"], { message: "Pilih jenis kelamin." });
export const zTelp = z
  .string()
  .regex(/^[0-9+\-\s]{10,16}$/, "Nomor telepon 10 sampai 16 digit.");
