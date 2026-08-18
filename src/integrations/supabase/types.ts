export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      character_reference_images: {
        Row: {
          character_id: string
          created_at: string
          error_message: string | null
          id: string
          image_prompt: string
          image_url: string | null
          is_approved: boolean
          project_id: string
          status: string
          updated_at: string
          version: number
          view_type: string
        }
        Insert: {
          character_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          image_prompt: string
          image_url?: string | null
          is_approved?: boolean
          project_id: string
          status?: string
          updated_at?: string
          version?: number
          view_type?: string
        }
        Update: {
          character_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          image_prompt?: string
          image_url?: string | null
          is_approved?: boolean
          project_id?: string
          status?: string
          updated_at?: string
          version?: number
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_reference_images_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_reference_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          accessories: string | null
          age: string | null
          appearance: string | null
          backstory: string | null
          body_type: string | null
          clothing: string | null
          colors: string | null
          created_at: string
          eye_color: string | null
          face: string | null
          hair: string | null
          hair_color: string | null
          id: string
          is_locked: boolean
          locked_traits: Json
          name: string
          personality: string | null
          project_id: string
          role: string | null
          sort_order: number
          traits: Json
          updated_at: string
        }
        Insert: {
          accessories?: string | null
          age?: string | null
          appearance?: string | null
          backstory?: string | null
          body_type?: string | null
          clothing?: string | null
          colors?: string | null
          created_at?: string
          eye_color?: string | null
          face?: string | null
          hair?: string | null
          hair_color?: string | null
          id?: string
          is_locked?: boolean
          locked_traits?: Json
          name: string
          personality?: string | null
          project_id: string
          role?: string | null
          sort_order?: number
          traits?: Json
          updated_at?: string
        }
        Update: {
          accessories?: string | null
          age?: string | null
          appearance?: string | null
          backstory?: string | null
          body_type?: string | null
          clothing?: string | null
          colors?: string | null
          created_at?: string
          eye_color?: string | null
          face?: string | null
          hair?: string | null
          hair_color?: string | null
          id?: string
          is_locked?: boolean
          locked_traits?: Json
          name?: string
          personality?: string | null
          project_id?: string
          role?: string | null
          sort_order?: number
          traits?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_images: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          image_prompt: string
          image_url: string | null
          is_selected: boolean
          project_id: string
          scene_id: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          image_prompt: string
          image_url?: string | null
          is_selected?: boolean
          project_id: string
          scene_id: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          image_prompt?: string
          image_url?: string | null
          is_selected?: boolean
          project_id?: string
          scene_id?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "generated_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_images_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      panels: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_prompt: string
          image_status: string
          image_url: string | null
          panel_number: number
          project_id: string
          scene_id: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_prompt: string
          image_status?: string
          image_url?: string | null
          panel_number: number
          project_id: string
          scene_id: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_prompt?: string
          image_status?: string
          image_url?: string | null
          panel_number?: number
          project_id?: string
          scene_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "panels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panels_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          art_style: string
          created_at: string
          duration: string
          ending: string | null
          genre: string
          id: string
          idea: string
          length: string
          logline: string | null
          status: string
          title: string
          updated_at: string
          voice: string
        }
        Insert: {
          art_style: string
          created_at?: string
          duration: string
          ending?: string | null
          genre: string
          id?: string
          idea: string
          length: string
          logline?: string | null
          status?: string
          title?: string
          updated_at?: string
          voice: string
        }
        Update: {
          art_style?: string
          created_at?: string
          duration?: string
          ending?: string | null
          genre?: string
          id?: string
          idea?: string
          length?: string
          logline?: string | null
          status?: string
          title?: string
          updated_at?: string
          voice?: string
        }
        Relationships: []
      }
      scene_audio: {
        Row: {
          audio_url: string | null
          created_at: string
          duration_ms: number | null
          enhanced_text: string | null
          error_message: string | null
          format: string
          id: string
          is_selected: boolean
          narration_text: string
          project_id: string
          provider: string
          scene_id: string
          status: string
          style: string
          updated_at: string
          version: number
          voice: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration_ms?: number | null
          enhanced_text?: string | null
          error_message?: string | null
          format?: string
          id?: string
          is_selected?: boolean
          narration_text: string
          project_id: string
          provider?: string
          scene_id: string
          status?: string
          style?: string
          updated_at?: string
          version?: number
          voice?: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration_ms?: number | null
          enhanced_text?: string | null
          error_message?: string | null
          format?: string
          id?: string
          is_selected?: boolean
          narration_text?: string
          project_id?: string
          provider?: string
          scene_id?: string
          status?: string
          style?: string
          updated_at?: string
          version?: number
          voice?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_audio_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_audio_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_clips: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          is_selected: boolean
          job_id: string | null
          model: string
          progress: number
          project_id: string
          prompt: string
          scene_id: string
          status: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          is_selected?: boolean
          job_id?: string | null
          model?: string
          progress?: number
          project_id: string
          prompt?: string
          scene_id: string
          status?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          is_selected?: boolean
          job_id?: string | null
          model?: string
          progress?: number
          project_id?: string
          prompt?: string
          scene_id?: string
          status?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scene_clips_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_clips_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          created_at: string
          dialogue: string | null
          emotion: string | null
          id: string
          music: string | null
          narration: string | null
          project_id: string
          scene_number: number
          shot_list: Json
          title: string
          transition: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dialogue?: string | null
          emotion?: string | null
          id?: string
          music?: string | null
          narration?: string | null
          project_id: string
          scene_number: number
          shot_list?: Json
          title: string
          transition?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dialogue?: string | null
          emotion?: string | null
          id?: string
          music?: string | null
          narration?: string | null
          project_id?: string
          scene_number?: number
          shot_list?: Json
          title?: string
          transition?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      video_renders: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          kind: string
          progress: number
          project_id: string
          status: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          kind?: string
          progress?: number
          project_id: string
          status?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          kind?: string
          progress?: number
          project_id?: string
          status?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_renders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
