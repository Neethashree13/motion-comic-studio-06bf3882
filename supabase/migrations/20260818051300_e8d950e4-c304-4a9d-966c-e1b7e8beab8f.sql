CREATE TABLE IF NOT EXISTS public.scene_clips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  job_id TEXT,
  prompt TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT 'google/veo-3.1-lite',
  status TEXT NOT NULL DEFAULT 'pending',
  progress INT NOT NULL DEFAULT 0,
  video_url TEXT,
  duration_ms INT,
  error_message TEXT,
  is_selected BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scene_clips_scene_idx ON public.scene_clips (scene_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scene_clips_project_idx ON public.scene_clips (project_id);
GRANT ALL ON public.scene_clips TO service_role;
ALTER TABLE public.scene_clips ENABLE ROW LEVEL SECURITY;