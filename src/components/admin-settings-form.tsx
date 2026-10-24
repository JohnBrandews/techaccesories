"use client";

import { useState, type FormEvent } from "react";

export function AdminSettingsForm({ siteName, adminPhone }: { siteName: string; adminPhone: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = Object.fromEntries(data.entries());
    try {
      const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update settings.");
      setMessage(result.message ?? "Settings updated.");
      form.reset();
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update settings."); setSaving(false);
    }
  }
  return <form className="admin-settings-form" onSubmit={save}>
    <section className="admin-settings-section"><div><h3>Store details</h3><p>These details appear across your storefront.</p></div><label>Website name<input name="siteName" required minLength={1} maxLength={80} defaultValue={siteName}/></label><label>Store phone number<input name="adminPhone" type="tel" maxLength={24} placeholder="e.g. +254 7XX XXX XXX" defaultValue={adminPhone}/><small>Shown as the store contact number.</small></label></section>
    <section className="admin-settings-section"><div><h3>Change password</h3><p>Leave these blank to keep your current password. Use at least 10 characters for a new password.</p></div><label>Current password<input name="currentPassword" type="password" autoComplete="current-password"/></label><label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={10} maxLength={128}/></label><label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={10} maxLength={128}/></label></section>
    {error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="admin-success-message" role="status">{message}</p> : null}
    <button className="admin-save-button" disabled={saving}>{saving ? "Saving settings…" : "Save changes"}</button>
  </form>;
}
