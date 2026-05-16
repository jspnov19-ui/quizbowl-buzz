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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      games: {
        Row: {
          bonuses_enabled: boolean
          buzz_locked: boolean
          buzzed_player_id: string | null
          code: string
          created_at: string
          current_question: number
          id: string
          mode: string
          round_ended: boolean
          status: string
          timer_remaining_seconds: number | null
          timer_started_at: string | null
          timer_status: string
          timer_total_seconds: number | null
        }
        Insert: {
          bonuses_enabled?: boolean
          buzz_locked?: boolean
          buzzed_player_id?: string | null
          code: string
          created_at?: string
          current_question?: number
          id?: string
          mode?: string
          round_ended?: boolean
          status?: string
          timer_remaining_seconds?: number | null
          timer_started_at?: string | null
          timer_status?: string
          timer_total_seconds?: number | null
        }
        Update: {
          bonuses_enabled?: boolean
          buzz_locked?: boolean
          buzzed_player_id?: string | null
          code?: string
          created_at?: string
          current_question?: number
          id?: string
          mode?: string
          round_ended?: boolean
          status?: string
          timer_remaining_seconds?: number | null
          timer_started_at?: string | null
          timer_status?: string
          timer_total_seconds?: number | null
        }
        Relationships: []
      }
      players: {
        Row: {
          created_at: string
          game_id: string
          id: string
          is_substitute: boolean
          name: string
          score: number
          team_id: string | null
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          is_substitute?: boolean
          name: string
          score?: number
          team_id?: string | null
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          is_substitute?: boolean
          name?: string
          score?: number
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      question_events: {
        Row: {
          bonus_points: number | null
          created_at: string
          game_id: string
          id: string
          player_id: string | null
          points: number
          protest_note: string | null
          protested: boolean
          question_number: number
          team_id: string | null
        }
        Insert: {
          bonus_points?: number | null
          created_at?: string
          game_id: string
          id?: string
          player_id?: string | null
          points?: number
          protest_note?: string | null
          protested?: boolean
          question_number: number
          team_id?: string | null
        }
        Update: {
          bonus_points?: number | null
          created_at?: string
          game_id?: string
          id?: string
          player_id?: string | null
          points?: number
          protest_note?: string | null
          protested?: boolean
          question_number?: number
          team_id?: string | null
        }
        Relationships: []
      }
      substitution_events: {
        Row: {
          action: string
          created_at: string
          game_id: string
          id: string
          player_id: string
          question_number: number
          team_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          game_id: string
          id?: string
          player_id: string
          question_number: number
          team_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          game_id?: string
          id?: string
          player_id?: string
          question_number?: number
          team_id?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          game_id: string
          id: string
          name: string
          score: number
          side: number
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          name: string
          score?: number
          side: number
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          name?: string
          score?: number
          side?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_brackets: {
        Row: {
          created_at: string
          id: string
          name: string
          ord: number
          phase_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          ord?: number
          phase_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          ord?: number
          phase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_brackets_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "tournament_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_games: {
        Row: {
          bracket_id: string | null
          created_at: string
          game_id: string | null
          id: string
          phase_id: string | null
          round_id: string | null
          score_a: number | null
          score_b: number | null
          status: string
          team_a_id: string | null
          team_b_id: string | null
          tournament_id: string
        }
        Insert: {
          bracket_id?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          phase_id?: string | null
          round_id?: string | null
          score_a?: number | null
          score_b?: number | null
          status?: string
          team_a_id?: string | null
          team_b_id?: string | null
          tournament_id: string
        }
        Update: {
          bracket_id?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          phase_id?: string | null
          round_id?: string | null
          score_a?: number | null
          score_b?: number | null
          status?: string
          team_a_id?: string | null
          team_b_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_games_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "tournament_brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_games_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "tournament_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_games_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "tournament_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_games_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_games_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_games_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_phases: {
        Row: {
          created_at: string
          id: string
          name: string
          ord: number
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          ord?: number
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          ord?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_phases_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_players: {
        Row: {
          created_at: string
          id: string
          name: string
          tournament_team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tournament_team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tournament_team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_players_tournament_team_id_fkey"
            columns: ["tournament_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_rounds: {
        Row: {
          created_at: string
          id: string
          label: string | null
          number: number
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          number: number
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          number?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_rounds_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_teams: {
        Row: {
          bracket_id: string | null
          created_at: string
          id: string
          name: string
          tournament_id: string
        }
        Insert: {
          bracket_id?: string | null
          created_at?: string
          id?: string
          name: string
          tournament_id: string
        }
        Update: {
          bracket_id?: string | null
          created_at?: string
          id?: string
          name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "tournament_brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
        }
        Relationships: []
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
