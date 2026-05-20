export type Database = {
  public: {
    Tables: {
      profiles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      obras: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      empresas: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      desvios: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      categorias_desvio: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      tratativas: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      anexos: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      historico_status: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      notificacoes: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
    }
    Views: {
      vw_desvios_completo: { Row: Record<string, unknown> }
    }
  }
}
