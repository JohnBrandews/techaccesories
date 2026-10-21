import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionToken } from "@/lib/auth-token";

export async function getCurrentSession() {
  const jar = await cookies();
  return readSessionToken(jar.get("techaccesories_session")?.value);
}

export async function requireAdminPage() {
  const session = await getCurrentSession();
  if (session?.role !== "admin") redirect("/login?next=%2Fadmin");
  return session;
}
