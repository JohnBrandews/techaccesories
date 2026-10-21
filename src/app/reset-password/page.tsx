import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/password-recovery-form";

export const metadata: Metadata = { title: "Reset password | TechAccesories" };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <ResetPasswordForm token={token}/>;
}
