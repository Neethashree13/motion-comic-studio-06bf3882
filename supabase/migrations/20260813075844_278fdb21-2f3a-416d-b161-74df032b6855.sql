CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled story',
  logline TEXT,
  idea TEXT NOT NULL,
  genre TEXT NOT NULL,
  length TEXT NOT NULL,
  art_style TEXT NOT NULL,
  duration TEXT NOT NULL,
  voice TEXT NOT NULL,
  ending TEXT,
  status TEXT NOT NULL DEFAULT 'story',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.characters (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  appearance TEXT,
  traits JSONB NOT NULL DEFAULT '[]',
  hair TEXT,
  hair_color TEXT,
  eye_color TEXT,
  clothing TEXT,
  accessories TEXT,
  colors TEXT,
  age TEXT,
  personality TEXT,
  backstory TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT characters_pkey PRIMARY KEY (id),
  CONSTRAINT characters_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.scenes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  scene_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  narration TEXT,
  dialogue TEXT,
  music TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT scenes_pkey PRIMARY KEY (id),
  CONSTRAINT scenes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.panels (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  scene_id UUID NOT NULL,
  panel_number INTEGER NOT NULL,
  image_prompt TEXT NOT NULL,
  caption TEXT,
  image_url TEXT,
  image_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT panels_pkey PRIMARY KEY (id),
  CONSTRAINT panels_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT panels_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.generated_images (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  scene_id UUID NOT NULL,
  image_url TEXT,
  image_prompt TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'generating',
  error_message TEXT,
  is_selected BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT generated_images_pkey PRIMARY KEY (id),
  CONSTRAINT generated_images_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT generated_images_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.character_reference_images (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL,
  project_id UUID NOT NULL,
  image_url TEXT,
  image_prompt TEXT NOT NULL,
  view_type TEXT NOT NULL DEFAULT 'front',
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'generating',
  error_message TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT character_reference_images_pkey PRIMARY KEY (id),
  CONSTRAINT character_reference_images_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT character_reference_images_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.scene_audio (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  scene_id UUID NOT NULL,
  audio_url TEXT,
  narration_text TEXT NOT NULL,
  voice TEXT NOT NULL DEFAULT 'alloy',
  provider TEXT NOT NULL DEFAULT 'lovable',
  format TEXT NOT NULL DEFAULT 'mp3',
  duration_ms INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  is_selected BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT scene_audio_pkey PRIMARY KEY (id),
  CONSTRAINT scene_audio_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT scene_audio_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public.video_renders (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  video_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT video_renders_pkey PRIMARY KEY (id),
  CONSTRAINT video_renders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON public.projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS characters_project_id_sort_order_idx ON public.characters(project_id, sort_order);
CREATE INDEX IF NOT EXISTS scenes_project_id_scene_number_idx ON public.scenes(project_id, scene_number);
CREATE INDEX IF NOT EXISTS panels_project_id_panel_number_idx ON public.panels(project_id, panel_number);
CREATE INDEX IF NOT EXISTS generated_images_scene_id_version_idx ON public.generated_images(scene_id, version DESC);
CREATE INDEX IF NOT EXISTS generated_images_project_id_idx ON public.generated_images(project_id);
CREATE INDEX IF NOT EXISTS character_reference_images_character_id_view_type_version_idx ON public.character_reference_images(character_id, view_type, version);
CREATE INDEX IF NOT EXISTS scene_audio_scene_id_version_idx ON public.scene_audio(scene_id, version DESC);
CREATE INDEX IF NOT EXISTS scene_audio_project_id_idx ON public.scene_audio(project_id);
CREATE INDEX IF NOT EXISTS video_renders_project_id_created_at_idx ON public.video_renders(project_id, created_at DESC);

-- Motion comic studio additions
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS shot_list JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS emotion TEXT;
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS transition TEXT;

ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS face TEXT;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS body_type TEXT;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS locked_traits JSONB NOT NULL DEFAULT '{}';

ALTER TABLE public.scene_audio ADD COLUMN IF NOT EXISTS style TEXT NOT NULL DEFAULT 'neutral';
ALTER TABLE public.scene_audio ADD COLUMN IF NOT EXISTS enhanced_text TEXT;

ALTER TABLE public.video_renders ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'final';

-- The app talks to Postgres directly through Prisma (server-side only), so the
-- Data API roles need table privileges but no anon access.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_renders ENABLE ROW LEVEL SECURITY;