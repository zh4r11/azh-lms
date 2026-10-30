/**
 * Where uploaded files live. With SUPABASE_URL and SUPABASE_SECRET_KEY set (production on Vercel,
 * whose disk does not keep files) they go to a private Supabase Storage bucket; without them, to
 * storage/ on local disk. Kept free of "server-only" so the dummy-data script can use it too, but
 * it reads secrets, so never import it from a client component.
 */
import path from "node:path";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_DIR = path.join(process.cwd(), "storage");
const BUCKET = process.env.SUPABASE_BUCKET ?? "berkas";

export const pakaiSupabase = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

let klien: SupabaseClient | null = null;
function bucket() {
  klien ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return klien.storage.from(BUCKET);
}

export function pathLokal(kunci: string) {
  return path.join(STORAGE_DIR, path.basename(kunci));
}

/** Writes a whole file at once (used for small generated files such as the dummy PDFs). */
export async function tulisBerkas(kunci: string, data: Buffer, mime: string) {
  if (!pakaiSupabase()) {
    await mkdir(STORAGE_DIR, { recursive: true });
    await writeFile(pathLokal(kunci), data);
    return;
  }
  const { error } = await bucket().upload(kunci, data, { contentType: mime, upsert: true });
  if (error) throw new Error(`Gagal menyimpan ${kunci} ke Supabase Storage: ${error.message}`);
}

/** A one-time URL the browser can PUT the file body to, bypassing our server's body limit. */
export async function urlUnggah(kunci: string) {
  const { data, error } = await bucket().createSignedUploadUrl(kunci);
  if (error) throw new Error(`Gagal membuat URL unggah: ${error.message}`);
  return data.signedUrl;
}

/** Size of a stored object in bytes, or null when it is not there. */
export async function ukuranTersimpan(kunci: string): Promise<number | null> {
  if (!pakaiSupabase()) {
    const info = await stat(pathLokal(kunci)).catch(() => null);
    return info?.size ?? null;
  }
  const { data, error } = await bucket().info(kunci);
  if (error || !data) return null;
  return typeof data.size === "number" ? data.size : null;
}

/** A short-lived link to the stored object, for the download route to redirect to. */
export async function urlUnduh(kunci: string, nama: string, unduh: boolean) {
  const { data, error } = await bucket().createSignedUrl(kunci, 300, { download: unduh ? nama : false });
  if (error) throw new Error(`Gagal membuat URL unduh: ${error.message}`);
  return data.signedUrl;
}

export async function hapusBerkas(kunci: string) {
  if (!pakaiSupabase()) {
    await unlink(pathLokal(kunci)).catch(() => {});
    return;
  }
  await bucket().remove([kunci]);
}

/** Empties the store. Only the dummy-data script calls this. */
export async function kosongkanPenyimpanan() {
  if (!pakaiSupabase()) {
    await mkdir(STORAGE_DIR, { recursive: true });
    for (const f of await readdir(STORAGE_DIR)) await unlink(path.join(STORAGE_DIR, f)).catch(() => {});
    return;
  }
  for (;;) {
    const { data, error } = await bucket().list("", { limit: 1000 });
    if (error) throw new Error(`Gagal membaca isi bucket: ${error.message}`);
    const nama = (data ?? []).map((o) => o.name).filter(Boolean);
    if (!nama.length) return;
    await bucket().remove(nama);
  }
}
