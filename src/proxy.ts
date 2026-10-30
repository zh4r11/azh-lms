import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

// Optimistic check only: pages and actions still verify the user and role themselves.
export async function proxy(request: NextRequest) {
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;
  if (pathname === "/keluar") return NextResponse.next();
  const onLogin = pathname === "/login";

  if (!session && !onLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (session && onLogin) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  // api/unggah checks the session itself: proxy would buffer (and cut) large upload bodies.
  matcher: ["/((?!_next/static|_next/image|api/unggah|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
