import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { BerkasError, JENIS_BERKAS, simpanBerkas, type JenisBerkas } from "@/lib/berkas";

/**
 * Receives one file as the raw request body and streams it to storage/. Kept out of proxy.ts and
 * out of server actions, which both buffer the whole body in memory with small limits.
 * Headers: x-nama (URI-encoded file name), x-jenis ("dokumen" or "video"), content-length.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sesi berakhir. Silakan masuk lagi." }, { status: 401 });

  const jenis = request.headers.get("x-jenis") as JenisBerkas | null;
  const nama = decodeURIComponent(request.headers.get("x-nama") ?? "");
  const ukuran = Number(request.headers.get("content-length"));
  if (!jenis || !(jenis in JENIS_BERKAS) || !nama || !request.body) {
    return NextResponse.json({ error: "Permintaan unggah tidak lengkap." }, { status: 400 });
  }

  try {
    const b = await simpanBerkas(request.body, { nama, ukuran, jenis, userId: user.id });
    return NextResponse.json({ id: b.id, nama: b.nama, ukuran: b.ukuran });
  } catch (e) {
    if (e instanceof BerkasError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Gagal menyimpan berkas. Coba lagi." }, { status: 500 });
  }
}
