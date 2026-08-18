-- AI-animated scene clips (Veo image-to-video).
CREATE TABLE IF NOT EXISTS "scene_clips" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "scene_id" UUID NOT NULL,
  "job_id" TEXT,
  "prompt" TEXT NOT NULL DEFAULT '',
  "model" TEXT NOT NULL DEFAULT 'google/veo-3.1-lite',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "video_url" TEXT,
  "duration_ms" INTEGER,
  "error_message" TEXT,
  "is_selected" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "scene_clips_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scene_clips_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "scene_clips_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scenes"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "scene_clips_scene_idx" ON "scene_clips" ("scene_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "scene_clips_project_idx" ON "scene_clips" ("project_id");
