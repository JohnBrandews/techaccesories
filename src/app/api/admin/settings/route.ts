import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requireAdminRequest } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function PATCH(request: Request) {
  const auth = requireAdminRequest(request);
  if (auth) return auth;
  const session = await getCurrentSession();
  if (!session?.sub || session.role !== "admin") return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const siteName = typeof body.siteName === "string" ? body.siteName.trim() : "";
  const adminPhone = typeof body.adminPhone === "string" ? body.adminPhone.trim() : "";
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  if (!siteName || siteName.length > 80) return NextResponse.json({ error: "Enter a website name between 1 and 80 characters." }, { status: 400 });
  if (adminPhone && !/^\+?[0-9 ()-]{7,24}$/.test(adminPhone)) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  if (newPassword && (newPassword.length < 10 || newPassword.length > 128)) return NextResponse.json({ error: "Use a password between 10 and 128 characters." }, { status: 400 });
  if (newPassword && newPassword !== confirmPassword) return NextResponse.json({ error: "The new passwords do not match." }, { status: 400 });
  if (!newPassword && confirmPassword) return NextResponse.json({ error: "Enter a new password to confirm it." }, { status: 400 });

  const admin = await prisma.user.findUnique({ where: { id: session.sub }, select: { passwordHash: true } });
  if (!admin) return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
  if (newPassword && (!currentPassword || !verifyPassword(currentPassword, admin.passwordHash))) return NextResponse.json({ error: "Enter your current password to change it." }, { status: 400 });
  try {
    await prisma.$transaction(async tx => {
      await tx.siteSetting.upsert({ where: { id: "global" }, create: { id: "global", siteName, adminPhone: adminPhone || null, updatedAt: new Date() }, update: { siteName, adminPhone: adminPhone || null } });
      if (newPassword) await tx.user.update({ where: { id: session.sub }, data: { passwordHash: hashPassword(newPassword) } });
    }, { maxWait: 10_000, timeout: 15_000 });
    return NextResponse.json({ ok: true, message: "Settings updated." });
  } catch (error) {
    console.error("Admin settings update failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not save settings. Please try again." }, { status: 500 });
  }
}
