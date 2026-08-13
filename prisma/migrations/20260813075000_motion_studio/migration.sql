-- Motion comic studio: shot lists, character bible fields, narration styles, render kind.
ALTER TABLE "scenes" ADD COLUMN IF NOT EXISTS "shot_list" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "scenes" ADD COLUMN IF NOT EXISTS "emotion" TEXT;
ALTER TABLE "scenes" ADD COLUMN IF NOT EXISTS "transition" TEXT;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "face" TEXT;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "body_type" TEXT;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "locked_traits" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "scene_audio" ADD COLUMN IF NOT EXISTS "style" TEXT NOT NULL DEFAULT 'neutral';
ALTER TABLE "scene_audio" ADD COLUMN IF NOT EXISTS "enhanced_text" TEXT;
ALTER TABLE "video_renders" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'final';
