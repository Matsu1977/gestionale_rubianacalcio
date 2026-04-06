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
          data_inizio: string
          id: string
          importo_totale: number
          numero_rate: number
          persona_id: string
          stagione: string
          stato_pagamento: string
          tipo_pagamento: string
        }
        Insert: {
          corso: string
          created_at?: string
          data_inizio?: string
          id?: string
          importo_totale?: number
          numero_rate?: number
          persona_id: string
          stagione: string
          stato_pagamento?: string
          tipo_pagamento?: string
        }
        Update: {
          corso?: string
          created_at?: string
          data_inizio?: string
          id?: string
          importo_totale?: number
          numero_rate?: number
          persona_id?: string
          stagione?: string
          stato_pagamento?: string
          tipo_pagamento?: string
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
      categorie_spesa: {
        Row: {
          created_at: string
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          tipo?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      comunicazioni: {
        Row: {
          corso_filtro: string | null
          created_at: string
          id: string
          messaggio: string
          oggetto: string
          tipo_destinatari: string
        }
        Insert: {
          corso_filtro?: string | null
          created_at?: string
          id?: string
          messaggio: string
          oggetto: string
          tipo_destinatari?: string
        }
        Update: {
          corso_filtro?: string | null
          created_at?: string
          id?: string
          messaggio?: string
          oggetto?: string
          tipo_destinatari?: string
        }
        Relationships: []
      }
      comunicazioni_destinatari: {
        Row: {
          comunicazione_id: string
          created_at: string
          id: string
          persona_id: string
        }
        Insert: {
          comunicazione_id: string
          created_at?: string
          id?: string
          persona_id: string
        }
        Update: {
          comunicazione_id?: string
          created_at?: string
          id?: string
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicazioni_destinatari_comunicazione_id_fkey"
            columns: ["comunicazione_id"]
            isOneToOne: false
            referencedRelation: "comunicazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicazioni_destinatari_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
        ]
      }
      corsi: {
        Row: {
          attivo: boolean
          created_at: string
          descrizione: string | null
          id: string
          nome: string
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          descrizione?: string | null
          id?: string
          nome: string
        }
        Update: {
          attivo?: boolean
          created_at?: string
          descrizione?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      documenti_firmati: {
        Row: {
          created_at: string
          data_firma: string
          file_path: string
          id: string
          nome_persona: string
          persona_id: string
          tipo_documento: string
        }
        Insert: {
          created_at?: string
          data_firma?: string
          file_path: string
          id?: string
          nome_persona: string
          persona_id: string
          tipo_documento: string
        }
        Update: {
          created_at?: string
          data_firma?: string
          file_path?: string
          id?: string
          nome_persona?: string
          persona_id?: string
          tipo_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "documenti_firmati_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
        ]
      }
      impostazioni_generali: {
        Row: {
          chiave: string
          created_at: string
          id: string
          updated_at: string
          valore: string | null
        }
        Insert: {
          chiave: string
          created_at?: string
          id?: string
          updated_at?: string
          valore?: string | null
        }
        Update: {
          chiave?: string
          created_at?: string
          id?: string
          updated_at?: string
          valore?: string | null
        }
        Relationships: []
      }
      modelli_documento: {
        Row: {
          attivo: boolean
          contenuto: string
          created_at: string
          id: string
          tipo_documento: string
          titolo: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          contenuto: string
          created_at?: string
          id?: string
          tipo_documento: string
          titolo: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          contenuto?: string
          created_at?: string
          id?: string
          tipo_documento?: string
          titolo?: string
          updated_at?: string
        }
        Relationships: []
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
      notifiche: {
        Row: {
          created_at: string
          id: string
          letta: boolean
          messaggio: string
          ruolo_destinatario: string | null
          tipo: string
          titolo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          letta?: boolean
          messaggio: string
          ruolo_destinatario?: string | null
          tipo?: string
          titolo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          letta?: boolean
          messaggio?: string
          ruolo_destinatario?: string | null
          tipo?: string
          titolo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifiche_lette: {
        Row: {
          created_at: string
          id: string
          notifica_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notifica_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notifica_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifiche_lette_notifica_id_fkey"
            columns: ["notifica_id"]
            isOneToOne: false
            referencedRelation: "notifiche"
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
        }
        Relationships: []
      }
      presenze: {
        Row: {
          created_at: string
          id: string
          persona_id: string
          presente: boolean
          sessione_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          persona_id: string
          presente?: boolean
          sessione_id: string
        }
        Update: {
          created_at?: string
          id?: string
          persona_id?: string
          presente?: boolean
          sessione_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presenze_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presenze_sessione_id_fkey"
            columns: ["sessione_id"]
            isOneToOne: false
            referencedRelation: "sessioni_allenamento"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
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
      sessioni_allenamento: {
        Row: {
          corso: string
          created_at: string
          data: string
          id: string
          note: string | null
        }
        Insert: {
          corso: string
          created_at?: string
          data?: string
          id?: string
          note?: string | null
        }
        Update: {
          corso?: string
          created_at?: string
          data?: string
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      tesseramenti: {
        Row: {
          created_at: string
          data_fine: string | null
          data_inizio: string
          id: string
          importo: number
          metodo_pagamento: string | null
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
          metodo_pagamento?: string | null
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
          metodo_pagamento?: string | null
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "allenatore" | "segreteria" | "atleta"
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
      app_role: ["admin", "allenatore", "segreteria", "atleta"],
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
