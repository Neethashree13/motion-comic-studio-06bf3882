export interface PanelRecord {
  id: string;
  panel_number: number;
  image_prompt: string;
  caption: string | null;
  image_url: string | null;
  image_status: 'pending' | 'generating' | 'ready' | 'failed';
  scene_id: string;
  project_id: string;
  error_message?: string | null;
  created_at?: string;
}

export interface SceneRecord {
  id: string;
  project_id: string;
  scene_number: number;
  title: string;
  narration: string | null;
  dialogue: string | null;
  created_at?: string;
}

export interface ProjectRecord {
  id: string;
  title: string;
  genre: string;
  art_style: string;
  logline: string | null;
  status?: string;
  created_at?: string;
}

export interface CharacterDetail {
  id: string;
  project_id?: string;
  name: string;
  role?: string | null;
  appearance?: string | null;
  hair?: string | null;
  hair_color?: string | null;
  eye_color?: string | null;
  clothing?: string | null;
  accessories?: string | null;
  colors?: string | null;
  color_palette?: string | null;
  age?: string | null;
  personality?: string | null;
  backstory?: string | null;
  description?: string | null;
  traits?: string[];
  is_locked?: boolean;
}

export interface SceneAudioRecord {
  id: string;
  project_id: string;
  scene_id: string;
  narration_text: string;
  voice: string;
  provider: string;
  format: string;
  duration_ms: number | null;
  version: number;
  status: string;
  error_message: string | null;
  is_selected: boolean;
  created_at: string;
  url: string | null;
}
