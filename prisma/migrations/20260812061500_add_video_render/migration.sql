-- CreateTable
CREATE TABLE "video_renders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "video_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "video_renders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_renders_project_id_created_at_idx" ON "video_renders"("project_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "video_renders" ADD CONSTRAINT "video_renders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
