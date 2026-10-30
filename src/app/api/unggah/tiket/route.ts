import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { BerkasError, JENIS_BERKAS, mulaiUnggah, type JenisBerkas } from "@/lib/berkas";
import { pakaiSupabase } from "@/lib/penyimpanan";

/**
 * Step one of an upload. With Supabase Storage configured, returns a signed URL the browser PUTs
 * the file to, plus a ticket for /api/unggah/selesai. Without it, says so, and the browser sends
 * the file body to /api/unggah instead.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sesi berakhir. Silakan masuk lagi." }, { status: 401 });
  if (!pakaiSupabase()) return NextResponse.json({ lokal: true });

  const body = (await request.json().catch(() => null)) as { nama?: string; ukuran?: number; jenis?: string } | null;
  const jenis = body?.jenis as JenisBerkas | undefined;
  if (!body?.nama || typeof body.ukuran !== "number" || !jenis || !(jenis in JENIS_BERKAS)) {
    return NextResponse.json({ error: "Permintaan unggah tidak lengkap." }, { status: 400 });
  }
  try {
    return NextResponse.json(await mulaiUnggah({ nama: body.nama, ukuran: body.ukuran, jenis, userId: user.id }));
  } catch (e) {
    if (e instanceof BerkasError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Gagal menyiapkan unggahan. Coba lagi." }, { status: 500 });
  }
}
