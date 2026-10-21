import { NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth-token";

export function requireAdminRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${SESSION_COOKIE}=`));
  const session = readSessionToken(cookie ? cookie.slice(SESSION_COOKIE.length + 1) : null);
  if (session?.role === "admin") return null;
  return NextResponse.json({ error: "Admin sign-in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
