import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { emailButton, emailLayout, emailParagraph, publicSiteUrl, sendTransactionalEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } });
  if (user) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({ data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    const resetUrl = `${publicSiteUrl(new URL(request.url).origin)}/reset-password?token=${encodeURIComponent(token)}`;
    const text = `Hi ${user.name || "there"},\n\nUse this link to reset your Mahir Technology password. It expires in 30 minutes and can only be used once.\n${resetUrl}\n\nIf you did not request a reset, you can ignore this email.`;
    const html = emailLayout(`<h1 style="color:#12345a">Reset your password</h1>${emailParagraph(`Hi ${user.name || "there"}, use the secure link below to choose a new password. It expires in 30 minutes and can only be used once.`)}${emailButton("Reset password", resetUrl)}${emailParagraph("If you didn’t request this change, you can ignore this email.")}`);
    try { await sendTransactionalEmail({ to: user.email, name: user.name, subject: "Reset your Mahir Technology password", text, html }); }
    catch (error) {
      await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      console.error("Password reset email could not be sent:", error instanceof Error ? error.message : "Unknown email error");
    }
  }
  return NextResponse.json({ message: "If an account exists for that email, a password reset link has been sent." });
}
