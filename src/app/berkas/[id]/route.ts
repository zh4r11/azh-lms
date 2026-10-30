import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { bolehUnduh } from "@/lib/berkas";
import { pakaiSupabase, pathLokal, urlUnduh } from "@/lib/penyimpanan";

/**
 * Serves an uploaded file after checking the user may see what it belongs to. With Supabase
 * Storage the check is followed by a redirect to a five-minute signed URL (which handles Range
 * itself); on local disk the file is streamed here, with Range support so videos can be scrubbed.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/berkas/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Silakan masuk dulu.", { status: 401 });
  const berkas = await bolehUnduh(user, Number((await ctx.params).id));
  if (!berkas) return new Response("Berkas tidak ditemukan.", { status: 404 });
  const unduh = request.nextUrl.searchParams.has("unduh");

  if (pakaiSupabase()) {
    const url = await urlUnduh(berkas.kunci, berkas.nama, unduh).catch(() => null);
    if (!url) return new Response("Berkas tidak ada di penyimpanan.", { status: 404 });
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store" } });
  }

  const file = pathLokal(berkas.kunci);
  const info = await stat(file).catch(() => null);
  if (!info) return new Response("Berkas tidak ada di penyimpanan.", { status: 404 });

  const headers = new Headers({
    "Content-Type": berkas.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "Content-Disposition": `${unduh ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(berkas.nama)}`,
  });

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (start > end || start >= info.size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
    headers.set("Content-Length", String(end - start + 1));
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers });
  }

  headers.set("Content-Length", String(info.size));
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers });
}
