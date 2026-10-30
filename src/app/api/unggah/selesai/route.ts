import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { BerkasError, selesaiUnggah } from "@/lib/berkas";

/** Step two: the browser has sent the file to storage; check it and record it. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sesi berakhir. Silakan masuk lagi." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { tiket?: string } | null;
  if (!body?.tiket) return NextResponse.json({ error: "Tiket unggah tidak ada." }, { status: 400 });
  try {
    const b = await selesaiUnggah(body.tiket, user.id);
    return NextResponse.json({ id: b.id, nama: b.nama, ukuran: b.ukuran });
  } catch (e) {
    if (e instanceof BerkasError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Gagal mencatat berkas. Coba lagi." }, { status: 500 });
  }
}
