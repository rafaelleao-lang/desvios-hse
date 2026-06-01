-- ============================================================
-- INDICADORES HSE SEMANAIS
-- ============================================================

CREATE TABLE IF NOT EXISTS indicadores_semanais (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id                   UUID REFERENCES obras(id) ON DELETE CASCADE NOT NULL,
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

  criado_em                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (obra_id, semana, ano)
);

-- Row Level Security
ALTER TABLE indicadores_semanais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "indicadores_autenticados" ON indicadores_semanais;
CREATE POLICY "indicadores_autenticados" ON indicadores_semanais
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permite acesso anônimo temporariamente (igual ao padrão das outras tabelas)
DROP POLICY IF EXISTS "indicadores_anonimo" ON indicadores_semanais;
CREATE POLICY "indicadores_anonimo" ON indicadores_semanais
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION trigger_set_indicadores_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_indicadores_updated ON indicadores_semanais;
CREATE TRIGGER set_indicadores_updated
  BEFORE UPDATE ON indicadores_semanais
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_indicadores_updated();

-- Index para queries por obra e período
CREATE INDEX IF NOT EXISTS idx_indicadores_obra_semana
  ON indicadores_semanais (obra_id, ano, semana);

CREATE INDEX IF NOT EXISTS idx_indicadores_ano
  ON indicadores_semanais (ano);
