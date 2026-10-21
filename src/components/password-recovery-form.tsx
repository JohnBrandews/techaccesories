"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

function RecoveryBrand() {
  return <Link href="/" className="brand auth-brand"><span className="brand-mark"><span>MT</span></span><span className="brand-copy"><strong>MAHIR TECHNOLOGY</strong><small>COMPUTING &amp; TECH</small></span></Link>;
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    const email = new FormData(event.currentTarget).get("email");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not request a reset link.");
      setMessage(result.message ?? "If an account exists for that email, a reset link has been sent.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not request a reset link."); }
    finally { setSaving(false); }
  }
  return <main className="auth-page content-width"><section className="auth-card"><RecoveryBrand/><span className="eyebrow">ACCOUNT RECOVERY</span><h1>Forgot your password?</h1><p>Enter the email address on your account and we’ll send a secure reset link.</p><form className="auth-form" onSubmit={submit}><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>{error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="checkout-notice" role="status">{message}</p> : null}<button className="primary-button full-button" disabled={saving}>{saving ? "Sending…" : "Send reset link"}</button></form><p className="auth-switch"><Link href="/login">Back to sign in</Link></p></section></main>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, token }) });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not reset your password.");
      setSuccess(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not reset your password."); }
    finally { setSaving(false); }
  }
  return <main className="auth-page content-width"><section className="auth-card"><RecoveryBrand/><span className="eyebrow">ACCOUNT RECOVERY</span><h1>Choose a new password</h1>{success ? <><p className="checkout-notice" role="status">Your password has been reset. Sign in with your new password.</p><Link className="primary-button full-button recovery-login-link" href="/login">Go to sign in</Link></> : !token ? <><p>This reset link is missing or invalid. Request a new link to continue.</p><Link className="primary-button full-button recovery-login-link" href="/forgot-password">Request a reset link</Link></> : <><p>Enter the email address for your account and choose a new password.</p><form className="auth-form" onSubmit={submit}><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>New password<input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128}/><small>Use at least 10 characters.</small></label><label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128}/></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button full-button" disabled={saving}>{saving ? "Resetting…" : "Reset password"}</button></form></>}<p className="auth-switch"><Link href="/login">Back to sign in</Link></p></section></main>;
}
