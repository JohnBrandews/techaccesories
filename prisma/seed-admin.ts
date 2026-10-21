import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 8) {
    throw new Error("Set a valid ADMIN_EMAIL and ADMIN_PASSWORD (at least 8 characters) in .env.");
  }
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hashPassword(password), role: "admin" },
    create: { email, passwordHash: hashPassword(password), role: "admin", name: "Store Admin" },
  });
  console.log(`Admin account ready for ${email}.`);
}

main().catch(error => {
  console.error("Could not create the admin account:", error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
