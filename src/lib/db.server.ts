import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __comicPrisma: PrismaClient | undefined;
}

/**
 * Picks a usable Postgres connection string.
 *
 * DATABASE_URL wins when it is set and reachable from the deployment. A
 * localhost URL only works on a developer machine, so when the app runs on the
 * hosted runtime we fall back to the managed cloud database instead of failing.
 */
function resolveConnectionString(): string {
  const direct = process.env["DATABASE_URL"]?.trim();
  const managed = process.env["SUPABASE_DB_URL"]?.trim();

  const isLocal = (value: string) => /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(value);

  if (direct && (!isLocal(direct) || !managed)) return direct;
  if (managed) return managed;

  throw new Error("DATABASE_URL is not set. Point it at your PostgreSQL database.");
}

/**
 * Lazily-created Prisma client.
 * Env vars are only guaranteed to exist at call time, so never build this at module scope.
 */
export function getDb(): PrismaClient {
  if (globalThis.__comicPrisma) return globalThis.__comicPrisma;

  const connectionString = resolveConnectionString();
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  globalThis.__comicPrisma = client;
  return client;
}
