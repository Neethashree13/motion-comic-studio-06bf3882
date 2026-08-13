-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL DEFAULT 'Untitled story',
    "logline" TEXT,
    "idea" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "length" TEXT NOT NULL,
    "art_style" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "voice" TEXT NOT NULL,
    "ending" TEXT,
    "status" TEXT NOT NULL DEFAULT 'story',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "appearance" TEXT,
    "traits" JSONB NOT NULL DEFAULT '[]',
    "hair" TEXT,
    "hair_color" TEXT,
    "eye_color" TEXT,
    "clothing" TEXT,
    "accessories" TEXT,
    "colors" TEXT,
    "age" TEXT,
    "personality" TEXT,
    "backstory" TEXT,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "scene_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "narration" TEXT,
    "dialogue" TEXT,
    "music" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "scene_id" UUID NOT NULL,
    "panel_number" INTEGER NOT NULL,
    "image_prompt" TEXT NOT NULL,
    "caption" TEXT,
    "image_url" TEXT,
    "image_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "panels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "scene_id" UUID NOT NULL,
    "image_url" TEXT,
    "image_prompt" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "error_message" TEXT,
    "is_selected" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "generated_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_reference_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "character_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "image_url" TEXT,
    "image_prompt" TEXT NOT NULL,
    "view_type" TEXT NOT NULL DEFAULT 'front',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "error_message" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "character_reference_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_updated_at_idx" ON "projects"("updated_at" DESC);

-- CreateIndex
CREATE INDEX "characters_project_id_sort_order_idx" ON "characters"("project_id", "sort_order");

-- CreateIndex
CREATE INDEX "scenes_project_id_scene_number_idx" ON "scenes"("project_id", "scene_number");

-- CreateIndex
CREATE INDEX "panels_project_id_panel_number_idx" ON "panels"("project_id", "panel_number");

-- CreateIndex
CREATE INDEX "generated_images_scene_id_version_idx" ON "generated_images"("scene_id", "version" DESC);

-- CreateIndex
CREATE INDEX "generated_images_project_id_idx" ON "generated_images"("project_id");

-- CreateIndex
CREATE INDEX "character_reference_images_character_id_view_type_version_idx" ON "character_reference_images"("character_id", "view_type", "version");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panels" ADD CONSTRAINT "panels_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panels" ADD CONSTRAINT "panels_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_images" ADD CONSTRAINT "generated_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_images" ADD CONSTRAINT "generated_images_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_reference_images" ADD CONSTRAINT "character_reference_images_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_reference_images" ADD CONSTRAINT "character_reference_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
