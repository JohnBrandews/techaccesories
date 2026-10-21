import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create account | Mahir Technology" };
export default function SignupPage() { return <Suspense><AuthForm mode="register"/></Suspense>; }
