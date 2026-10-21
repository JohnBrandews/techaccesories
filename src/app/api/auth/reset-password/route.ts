import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-token";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

class InvalidResetToken extends Error {}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || !token || token.length > 128) return NextResponse.json({ error: "This reset link is invalid or has expired. Request a new link." }, { status: 400 });
  if (password.length < 10 || password.length > 128) return NextResponse.json({ error: "Use a password between 10 and 128 characters." }, { status: 400 });
  if (password !== confirmPassword) return NextResponse.json({ error: "The passwords do not match." }, { status: 400 });

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: { select: { id: true, email: true } } } });
  if (!record || record.usedAt || record.expiresAt <= new Date() || record.user.email !== email) return NextResponse.json({ error: "This reset link is invalid or has expired. Request a new link." }, { status: 400 });

  try {
    const passwordHash = hashPassword(password);
    await prisma.$transaction(async tx => {
      const now = new Date();
      const claimed = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
      if (claimed.count !== 1) throw new InvalidResetToken();
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
      await tx.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: now } });
    });
    const response = NextResponse.json({ message: "Your password has been reset. Sign in with your new password." });
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    if (error instanceof InvalidResetToken) return NextResponse.json({ error: "This reset link has already been used or has expired. Request a new link." }, { status: 400 });
    return NextResponse.json({ error: "Could not reset the password. Please try again." }, { status: 500 });
  }
}
