import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/password-recovery-form";

export const metadata: Metadata = { title: "Forgot password | Mahir Technology" };
export default function ForgotPasswordPage() { return <ForgotPasswordForm/>; }
