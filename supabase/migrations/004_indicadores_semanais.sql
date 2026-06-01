-- ============================================================
-- INDICADORES HSE SEMANAIS
-- obra_id é TEXT para coincidir com obras.id (TEXT PK)
-- ============================================================

CREATE TABLE IF NOT EXISTS indicadores_semanais (
  id                        TEXT PRIMARY KEY,
  obra_id                   TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  semana                    INTEGER NOT NULL CHECK (semana BETWEEN 1 AND 53),
  ano                       INTEGER NOT NULL CHECK (ano >= 2020),

  -- Efetivo
  efetivo                   INTEGER NOT NULL DEFAULT 0,
  ausentes                  INTEGER NOT NULL DEFAULT 0,

  -- Documentos de segurança (APR/PT ou ABRA/Stop Take Five)
  apr_realizadas            INTEGER NOT NULL DEFAULT 0,
  pt_realizadas             INTEGER NOT NULL DEFAULT 0,

  -- Desvios
  desvios_ocorridos         INTEGER NOT NULL DEFAULT 0,
  desvios_solucionados      INTEGER NOT NULL DEFAULT 0,

  -- Alojamentos
  alojamentos_conformes     INTEGER NOT NULL DEFAULT 0,
  alojamentos_nao_conformes INTEGER NOT NULL DEFAULT 0,
  alojamentos_totais        INTEGER NOT NULL DEFAULT 0,

  -- Treinamento
  hht_semanal               DECIMAL(10,1) NOT NULL DEFAULT 0,
  pessoas_treinadas         INTEGER NOT NULL DEFAULT 0,
  dds                       INTEGER NOT NULL DEFAULT 0,

  -- Incidentes / segurança
  acidentes                 INTEGER NOT NULL DEFAULT 0,
  acidente_sem_afastamento  INTEGER NOT NULL DEFAULT 0,
  primeiros_socorros        INTEGER NOT NULL DEFAULT 0,
  quase_acidentes           INTEGER NOT NULL DEFAULT 0,
  danos_materiais           INTEGER NOT NULL DEFAULT 0,

  -- Outros
  campanhas                 INTEGER NOT NULL DEFAULT 0,
  inspecoes_semanais        INTEGER NOT NULL DEFAULT 0,
  observacoes               TEXT,

  criado_em                 TEXT NOT NULL,
  atualizado_em             TEXT NOT NULL,

  UNIQUE (obra_id, semana, ano)
);

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION trigger_set_indicadores_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW()::TEXT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_indicadores_updated ON indicadores_semanais;
CREATE TRIGGER set_indicadores_updated
  BEFORE UPDATE ON indicadores_semanais
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_indicadores_updated();

-- Índices para queries por obra e período
CREATE INDEX IF NOT EXISTS idx_indicadores_obra_semana
  ON indicadores_semanais (obra_id, ano, semana);

CREATE INDEX IF NOT EXISTS idx_indicadores_ano
  ON indicadores_semanais (ano);
