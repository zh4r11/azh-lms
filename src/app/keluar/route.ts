import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Clears a session cookie whose account no longer exists (deleted by an admin). Without this,
 * the proxy sends /login back to / because the cookie still decrypts, and / sends it to /login.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
