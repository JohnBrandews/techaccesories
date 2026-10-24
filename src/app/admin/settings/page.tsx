import { AdminSettingsForm } from "@/components/admin-settings-form";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();
  return <div className="admin-page-content">
    <div className="admin-page-intro"><div><span className="admin-overline">STORE CONFIGURATION</span><h2>Settings</h2><p>Update your store identity, contact phone and admin sign-in password.</p></div></div>
    <section className="admin-card admin-settings-card"><AdminSettingsForm siteName={settings.siteName} adminPhone={settings.adminPhone ?? ""}/></section>
  </div>;
}
