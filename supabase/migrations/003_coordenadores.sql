-- Tabela de coordenadores (vinculados à obra, como encarregados e TSTs)
CREATE TABLE IF NOT EXISTS coordenadores (
  id        TEXT PRIMARY KEY,
  obra_id   TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome      TEXT NOT NULL,
  telefone  TEXT,
  ativo     BOOLEAN NOT NULL DEFAULT true,
  criado_em TEXT NOT NULL
);

-- Colunas na tabela desvios
ALTER TABLE desvios ADD COLUMN IF NOT EXISTS coordenador_id   TEXT;
ALTER TABLE desvios ADD COLUMN IF NOT EXISTS coordenador_nome TEXT;
