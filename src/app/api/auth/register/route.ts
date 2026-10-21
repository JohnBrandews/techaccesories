import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth-token";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || password.length < 10 || password.length > 128) {
    return NextResponse.json({ error: "Enter a valid email and a password between 10 and 128 characters." }, { status: 400 });
  }
  try {
    const user = await prisma.user.create({ data: { name: name || null, email, passwordHash: hashPassword(password), role: "customer" }, select: { id: true, email: true, name: true, role: true } });
    const response = NextResponse.json({ user: { email: user.email, role: user.role } }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "An account with this email already exists. Sign in instead." }, { status: 409 });
    return NextResponse.json({ error: "Could not create your account." }, { status: 500 });
  }
}
