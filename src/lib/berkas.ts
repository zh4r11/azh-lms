import "server-only";
import path from "node:path";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { aksesKursus } from "@/lib/lingkup";
import { STORAGE_DIR, hapusBerkas, pathLokal, ukuranTersimpan, urlUnggah } from "@/lib/penyimpanan";

const MB = 1024 * 1024;

/** What may be uploaded. Anything else is refused before a byte is written. */
export const JENIS_BERKAS = {
  dokumen: {
    batas: 25 * MB,
    ekstensi: [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".jpg", ".jpeg", ".png", ".zip"],
  },
  // 50 MB is the largest single file Supabase Storage takes on its free plan.
  video: { batas: 50 * MB, ekstensi: [".mp4", ".webm", ".mov"] },
} as const;
export type JenisBerkas = keyof typeof JENIS_BERKAS;

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".zip": "application/zip",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

export class BerkasError extends Error {}

export function cekBerkas(nama: string, ukuran: number, jenis: JenisBerkas) {
  const ext = path.extname(nama).toLowerCase();
  const aturan = JENIS_BERKAS[jenis];
  if (!(aturan.ekstensi as readonly string[]).includes(ext)) {
    throw new BerkasError(`Jenis berkas ${ext || "tanpa ekstensi"} tidak diterima. Gunakan ${aturan.ekstensi.join(", ")}.`);
  }
  if (ukuran > aturan.batas) {
    throw new BerkasError(`Berkas terlalu besar. Maksimal ${aturan.batas / MB} MB.`);
  }
  return { ext, mime: MIME[ext] };
}

/** Streams an upload to disk, stopping as soon as it passes the size limit. */
export async function simpanBerkas(
  body: ReadableStream<Uint8Array>,
  meta: { nama: string; ukuran: number; jenis: JenisBerkas; userId: number },
) {
  const { ext, mime } = cekBerkas(meta.nama, meta.ukuran, meta.jenis);
  await mkdir(STORAGE_DIR, { recursive: true });
  const kunci = `${randomUUID()}${ext}`;
  const tujuan = pathLokal(kunci);
  const batas = JENIS_BERKAS[meta.jenis].batas;
  let ditulis = 0;
  const penjaga = new Transform({
    transform(chunk: Buffer, _enc, next) {
      ditulis += chunk.length;
      if (ditulis > batas) next(new BerkasError(`Berkas terlalu besar. Maksimal ${batas / MB} MB.`));
      else next(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(body as import("node:stream/web").ReadableStream), penjaga, createWriteStream(tujuan));
  } catch (e) {
    await unlink(tujuan).catch(() => {});
    throw e;
  }
  return prisma.berkas.create({
    data: { nama: path.basename(meta.nama), mime, ukuran: ditulis, kunci, pengunggahId: meta.userId },
  });
}

// ---------------------------------------------------------------------------------------------
// Direct uploads to Supabase Storage. The server hands out a signed upload URL plus a ticket that
// records what was promised; after the browser has sent the file, the ticket turns into a Berkas
// row once the stored size checks out. The ticket is HMAC-signed, so it cannot be edited.

type Tiket = { k: string; n: string; m: string; j: JenisBerkas; u: number; e: number };

const tanda = (data: string) => createHmac("sha256", process.env.SESSION_SECRET ?? "").update(data).digest("base64url");

export async function mulaiUnggah(meta: { nama: string; ukuran: number; jenis: JenisBerkas; userId: number }) {
  const { ext, mime } = cekBerkas(meta.nama, meta.ukuran, meta.jenis);
  const kunci = `${randomUUID()}${ext}`;
  const url = await urlUnggah(kunci);
  const isi: Tiket = { k: kunci, n: path.basename(meta.nama), m: mime, j: meta.jenis, u: meta.userId, e: Date.now() + 2 * 3_600_000 };
  const data = Buffer.from(JSON.stringify(isi)).toString("base64url");
  return { url, mime, tiket: `${data}.${tanda(data)}` };
}

export async function selesaiUnggah(tiket: string, userId: number) {
  const [data, sig] = tiket.split(".");
  const harus = data ? tanda(data) : "";
  if (!data || !sig || sig.length !== harus.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(harus))) {
    throw new BerkasError("Tiket unggah tidak sah. Unggah ulang.");
  }
  const t = JSON.parse(Buffer.from(data, "base64url").toString()) as Tiket;
  if (t.u !== userId || t.e < Date.now()) throw new BerkasError("Tiket unggah sudah kedaluwarsa. Unggah ulang.");
  const ukuran = await ukuranTersimpan(t.k);
  if (ukuran === null) throw new BerkasError("Berkas belum sampai di penyimpanan. Unggah ulang.");
  if (ukuran > JENIS_BERKAS[t.j].batas) {
    await hapusBerkas(t.k);
    throw new BerkasError(`Berkas terlalu besar. Maksimal ${JENIS_BERKAS[t.j].batas / MB} MB.`);
  }
  return prisma.berkas.create({ data: { nama: t.n, mime: t.m, ukuran, kunci: t.k, pengunggahId: userId } });
}

/**
 * Who may download a file: whoever may see the thing it is attached to. A student answer is
 * only for that student and the teachers of the subject; a file not attached yet is only for
 * the person who uploaded it.
 */
export async function bolehUnduh(user: CurrentUser, berkasId: number) {
  const b = await prisma.berkas.findUnique({
    where: { id: berkasId },
    include: {
      materi: { include: { pertemuan: true, bahanAjar: true } },
      asesmen: { select: { kelasId: true, pelajaranId: true, terbit: true } },
      pengerjaan: { include: { asesmen: { select: { kelasId: true, pelajaranId: true } } } },
    },
  });
  if (!b) return null;
  if (user.role === "ADMIN" || b.pengunggahId === user.id) return b;

  for (const m of b.materi) {
    // School default material is open to every signed-in user.
    if (m.bahanAjar) return b;
    if (m.pertemuan && (await aksesKursus(user, m.pertemuan.kelasId, m.pertemuan.pelajaranId))) return b;
  }
  for (const a of b.asesmen) {
    const akses = await aksesKursus(user, a.kelasId, a.pelajaranId);
    if (akses === "kelola" || (akses && a.terbit)) return b;
  }
  for (const p of b.pengerjaan) {
    if (user.role === "SISWA" ? p.siswaId === user.siswaId : await aksesKursus(user, p.asesmen.kelasId, p.asesmen.pelajaranId)) {
      return b;
    }
  }
  return null;
}

/** Turns a berkasId from a form into a file the user uploaded, or refuses it. */
export async function berkasMilik(userId: number, berkasId: number | null) {
  if (!berkasId) return null;
  const b = await prisma.berkas.findUnique({ where: { id: berkasId } });
  if (!b || b.pengunggahId !== userId) throw new BerkasError("Berkas tidak ditemukan. Unggah ulang.");
  return b;
}

export function formatUkuran(byte: number) {
  if (byte >= MB) return `${(byte / MB).toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(byte / 1024))} KB`;
}
