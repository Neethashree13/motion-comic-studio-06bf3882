-- CreateTable
CREATE TABLE "scene_audio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "scene_id" UUID NOT NULL,
    "audio_url" TEXT,
    "narration_text" TEXT NOT NULL,
    "voice" TEXT NOT NULL DEFAULT 'alloy',
    "provider" TEXT NOT NULL DEFAULT 'lovable',
    "format" TEXT NOT NULL DEFAULT 'mp3',
    "duration_ms" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "is_selected" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scene_audio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scene_audio_scene_id_version_idx" ON "scene_audio"("scene_id", "version" DESC);

-- CreateIndex
CREATE INDEX "scene_audio_project_id_idx" ON "scene_audio"("project_id");

-- AddForeignKey
ALTER TABLE "scene_audio" ADD CONSTRAINT "scene_audio_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_audio" ADD CONSTRAINT "scene_audio_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
