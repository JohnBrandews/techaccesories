import { AdminShell } from "@/components/admin-shell";
import { requireAdminPage } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAdminPage();
  const settings = await getSiteSettings();
  return <AdminShell siteName={settings.siteName} email={session.email}>{children}</AdminShell>;
}
