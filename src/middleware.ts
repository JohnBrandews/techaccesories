import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (request.cookies.has("techaccesories_session")) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in as an admin to continue." }, { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
