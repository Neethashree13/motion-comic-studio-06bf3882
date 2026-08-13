import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __comicPrisma: PrismaClient | undefined;
}

/**
 * Lazily-created Prisma client.
 * Env vars are only guaranteed to exist at call time, so never build this at module scope.
 */
export function getDb(): PrismaClient {
  if (globalThis.__comicPrisma) {
    console.log("📦 Returning cached Prisma client");
    return globalThis.__comicPrisma;
  }

  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Point it at your PostgreSQL database.");
  }

  console.log("🔌 Creating new Prisma client with DATABASE_URL:", connectionString.split("@")[1] || "***");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  globalThis.__comicPrisma = client;
  console.log("✅ Prisma client initialized");
  return client;
}
