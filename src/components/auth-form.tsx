"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not sign you in.");
      router.replace(destination);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not complete sign-in.");
      setSaving(false);
    }
  }

  return <main className="auth-page content-width"><section className="auth-card"><Link href="/" className="brand auth-brand"><span className="brand-mark"><span>TA</span></span><span className="brand-copy"><strong>TECHACCESORIES</strong><small>COMPUTING &amp; TECH</small></span></Link><span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "YOUR TECHACCESORIES ACCOUNT"}</span><h1>{mode === "login" ? "Sign in to your account" : "Create your account"}</h1><p>{mode === "login" ? "Use the email and password registered to your account." : "Save your details and keep your orders together."}</p><form onSubmit={submit} className="auth-form">{mode === "register" ? <label>Name <span>Optional</span><input name="name" autoComplete="name" maxLength={100}/></label> : null}<label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? 1 : 10} maxLength={128}/>{mode === "register" ? <small>Use at least 10 characters.</small> : null}</label>{mode === "login" ? <Link className="forgot-password-link" href="/forgot-password">Forgot your password?</Link> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button full-button" disabled={saving}>{saving ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button></form><p className="auth-switch">{mode === "login" ? <>New to TechAccesories? <Link href="/signup">Create an account</Link></> : <>Already registered? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Sign in</Link></>}</p></section></main>;
}
