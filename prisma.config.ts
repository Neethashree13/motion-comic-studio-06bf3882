import path from "node:path";
import { defineConfig } from "prisma/config";

// DATABASE_URL is only required at runtime / migration time. Fall back to a
// placeholder so `prisma generate` (postinstall) never breaks the build.
const url = process.env["DATABASE_URL"] ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: { path: path.join("prisma", "migrations") },
  datasource: { url },
});
