import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in | TechAccesories" };
export default function LoginPage() { return <Suspense><AuthForm mode="login"/></Suspense>; }
