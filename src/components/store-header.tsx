import { StoreHeaderClient } from "@/components/store-header-client";
import { getCurrentSession } from "@/lib/auth";

type Category = { id: string; name: string; slug: string };

export async function StoreHeader({ categories }: { categories: Category[] }) {
  const session = await getCurrentSession();
  return <StoreHeaderClient categories={categories} account={session ? { email: session.email, name: session.name ?? null, role: session.role } : null}/>;
}
