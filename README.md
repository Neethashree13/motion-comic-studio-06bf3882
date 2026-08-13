# Comicverse AI

Comic story, character sheet and scene image generation powered by Gemini through the Lovable AI gateway.

## Stack

- TanStack Start (React 19 + Vite) with server functions
- PostgreSQL + Prisma (no Supabase)
- Local filesystem storage for generated images
- No authentication — every visitor sees the same workspace

## Environment

```
DATABASE_URL="postgresql://user:password@host:5432/comic?schema=public"
UPLOADS_DIR="uploads"          # optional, defaults to ./uploads
LOVABLE_API_KEY="..."          # AI gateway key for story + image generation
```

## Setup

```bash
bun install
bun run db:migrate      # creates the schema
bun run dev
```

## Data model

Prisma schema lives in `prisma/schema.prisma`: `projects`, `characters`, `scenes`,
`panels`, `generated_images` and `character_reference_images`. Column names are
snake_case and match the original database, so existing data can be imported with
a plain `pg_dump`/`pg_restore`.

## Storage

Generated PNGs are written under `UPLOADS_DIR` and served publicly from
`/api/public/files/<key>` (see `src/lib/storage.server.ts`). Swap that module for
S3/R2 if you deploy to a host without a writable filesystem — nothing else needs to
change.

## Hosting note

Local filesystem storage and any future ffmpeg (comic-to-video) work require a
Node/container host such as Fly.io, Render, Railway or Docker. Edge/worker hosts
have no persistent filesystem and cannot spawn ffmpeg.
