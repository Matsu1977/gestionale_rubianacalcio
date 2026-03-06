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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abbonamenti: {
        Row: {
          corso: string
          created_at: string
          id: string
          importo_totale: number
          numero_rate: number
          persona_id: string
          stagione: string
          stato_pagamento: string
        }
        Insert: {
          corso: string
          created_at?: string
          id?: string
          importo_totale?: number
          numero_rate?: number
          persona_id: string
          stagione: string
          stato_pagamento?: string
        }
        Update: {
          corso?: string
          created_at?: string
          id?: string
          importo_totale?: number
          numero_rate?: number
          persona_id?: string
          stagione?: string
          stato_pagamento?: string
        }
        Relationships: [
          {
            foreignKeyName: "abbonamenti_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
        ]
      }
      movimenti: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_movimento"]
          created_at: string
          data: string
          id: string
          importo: number
          metodo_pagamento: Database["public"]["Enums"]["metodo_pagamento"]
          note: string | null
          persona_id: string | null
          riferimento: string | null
          riferimento_id: string | null
          riferimento_tipo: string | null
          tipo: Database["public"]["Enums"]["tipo_movimento"]
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_movimento"]
          created_at?: string
          data?: string
          id?: string
          importo: number
          metodo_pagamento: Database["public"]["Enums"]["metodo_pagamento"]
          note?: string | null
          persona_id?: string | null
          riferimento?: string | null
          riferimento_id?: string | null
          riferimento_tipo?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimento"]
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_movimento"]
          created_at?: string
          data?: string
          id?: string
          importo?: number
          metodo_pagamento?: Database["public"]["Enums"]["metodo_pagamento"]
          note?: string | null
          persona_id?: string | null
          riferimento?: string | null
          riferimento_id?: string | null
          riferimento_tipo?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimento"]
        }
        Relationships: [
          {
            foreignKeyName: "movimenti_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
        ]
      }
      persone: {
        Row: {
          certificato_medico_scadenza: string | null
          codice_fiscale: string | null
          cognome: string
          created_at: string
          data_nascita: string | null
          email: string | null
          id: string
          indirizzo: string | null
          nome: string
          note: string | null
          telefono: string | null
        }
        Insert: {
          certificato_medico_scadenza?: string | null
          codice_fiscale?: string | null
          cognome: string
          created_at?: string
          data_nascita?: string | null
          email?: string | null
          id?: string
          indirizzo?: string | null
          nome: string
          note?: string | null
          telefono?: string | null
        }
        Update: {
          certificato_medico_scadenza?: string | null
          codice_fiscale?: string | null
          cognome?: string
          created_at?: string
          data_nascita?: string | null
          email?: string | null
          id?: string
          indirizzo?: string | null
          nome?: string
          note?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      rate: {
        Row: {
          abbonamento_id: string
          created_at: string
          data_scadenza: string
          id: string
          importo: number
          numero_rata: number
          stato: string
        }
        Insert: {
          abbonamento_id: string
          created_at?: string
          data_scadenza: string
          id?: string
          importo?: number
          numero_rata: number
          stato?: string
        }
        Update: {
          abbonamento_id?: string
          created_at?: string
          data_scadenza?: string
          id?: string
          importo?: number
          numero_rata?: number
          stato?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_abbonamento_id_fkey"
            columns: ["abbonamento_id"]
            isOneToOne: false
            referencedRelation: "abbonamenti"
            referencedColumns: ["id"]
          },
        ]
      }
      ruoli: {
        Row: {
          created_at: string
          data_fine: string | null
          data_inizio: string | null
          id: string
          persona_id: string
          tipo_ruolo: Database["public"]["Enums"]["tipo_ruolo"]
        }
        Insert: {
          created_at?: string
          data_fine?: string | null
          data_inizio?: string | null
          id?: string
          persona_id: string
          tipo_ruolo: Database["public"]["Enums"]["tipo_ruolo"]
        }
        Update: {
          created_at?: string
          data_fine?: string | null
          data_inizio?: string | null
          id?: string
          persona_id?: string
          tipo_ruolo?: Database["public"]["Enums"]["tipo_ruolo"]
        }
        Relationships: [
          {
            foreignKeyName: "ruoli_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
        ]
      }
      tesseramenti: {
        Row: {
          created_at: string
          data_fine: string | null
          data_inizio: string
          id: string
          importo: number
          persona_id: string
          stagione: string
          stato: string
          tipo_tesseramento: string
        }
        Insert: {
          created_at?: string
          data_fine?: string | null
          data_inizio?: string
          id?: string
          importo?: number
          persona_id: string
          stagione: string
          stato?: string
          tipo_tesseramento?: string
        }
        Update: {
          created_at?: string
          data_fine?: string | null
          data_inizio?: string
          id?: string
          importo?: number
          persona_id?: string
          stagione?: string
          stato?: string
          tipo_tesseramento?: string
        }
        Relationships: [
          {
            foreignKeyName: "tesseramenti_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
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
      categoria_movimento:
        | "Quota socio"
        | "Abbonamento"
        | "Tesseramento"
        | "Altro"
      metodo_pagamento: "Contanti" | "Bonifico" | "Carta" | "Satispay" | "Altro"
      tipo_movimento: "Entrata" | "Uscita"
      tipo_ruolo:
        | "Dirigente"
        | "Socio"
        | "Abbonato"
        | "Atleta"
        | "Allenatore"
        | "Genitore"
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
    Enums: {
      categoria_movimento: [
        "Quota socio",
        "Abbonamento",
        "Tesseramento",
        "Altro",
      ],
      metodo_pagamento: ["Contanti", "Bonifico", "Carta", "Satispay", "Altro"],
      tipo_movimento: ["Entrata", "Uscita"],
      tipo_ruolo: [
        "Dirigente",
        "Socio",
        "Abbonato",
        "Atleta",
        "Allenatore",
        "Genitore",
      ],
    },
  },
} as const
