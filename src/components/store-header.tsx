import { StoreHeaderClient } from "@/components/store-header-client";
import { getCurrentSession } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";

type Category = { id: string; name: string; slug: string };

export async function StoreHeader({ categories }: { categories: Category[] }) {
  const [session, settings] = await Promise.all([getCurrentSession(), getSiteSettings()]);
  return <StoreHeaderClient categories={categories} siteName={settings.siteName} account={session ? { email: session.email, name: session.name ?? null, role: session.role } : null}/>;
}
