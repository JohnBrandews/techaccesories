import "server-only";
import { prisma } from "@/lib/prisma";

export const defaultSiteName = "Mahir Technology";

export async function getSiteSettings() {
  try {
    const settings = await prisma.siteSetting.findUnique({ where: { id: "global" }, select: { siteName: true, adminPhone: true } });
    return { siteName: settings?.siteName || defaultSiteName, adminPhone: settings?.adminPhone ?? null };
  } catch (error) {
    console.error("Site settings are unavailable. Apply pending database migrations.", error instanceof Error ? error.message : "Unknown database error");
    return { siteName: defaultSiteName, adminPhone: null };
  }
}
