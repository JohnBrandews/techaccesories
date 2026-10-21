import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function neonDatasourceUrl() {
  const configured = process.env.DATABASE_URL;
  if (!configured) return undefined;

  try {
    const url = new URL(configured);
    if (!url.hostname.endsWith(".neon.tech")) return undefined;

    // Let Neon wake from scale-to-zero before Prisma gives up, and retire
    // idle client connections before Neon closes their sockets.
    const defaults: Record<string, string> = {
      connection_limit: "5",
      connect_timeout: "15",
      pool_timeout: "15",
      max_idle_connection_lifetime: "60",
    };
    for (const [key, value] of Object.entries(defaults)) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

const datasourceUrl = neonDatasourceUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
