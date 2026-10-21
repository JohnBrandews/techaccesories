import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function readDatabaseUrl() {
  const fromProcess = process.env.DATABASE_URL?.trim();
  if (fromProcess) return fromProcess;
  const envFile = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  const match = envFile.match(/^\s*DATABASE_URL\s*=\s*(.*?)\s*$/m);
  if (!match) throw new Error("DATABASE_URL is missing from .env.");
  return match[1].replace(/^(['"])(.*)\1$/, "$2");
}

const databaseUrl = new URL(readDatabaseUrl());
databaseUrl.hostname = databaseUrl.hostname.replace(/-pooler(?=\.)/, "");
const prismaCli = resolve(process.cwd(), "node_modules/prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl.toString() },
});

if (result.error) {
  console.error("Could not start Prisma migration deployment:", result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
