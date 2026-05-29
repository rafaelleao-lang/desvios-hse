-- Tabela de coordenadores (vinculados à obra, como encarregados e TSTs)
CREATE TABLE IF NOT EXISTS coordenadores (
  id        TEXT PRIMARY KEY,
  obra_id   TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome      TEXT NOT NULL,
  email     TEXT NOT NULL DEFAULT '',
  telefone  TEXT,
  ativo     BOOLEAN NOT NULL DEFAULT true,
  criado_em TEXT NOT NULL
);

-- Email do coordenador (caso a tabela já exista sem a coluna)
ALTER TABLE coordenadores ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';

-- Colunas na tabela desvios
ALTER TABLE desvios ADD COLUMN IF NOT EXISTS coordenador_id   TEXT;
ALTER TABLE desvios ADD COLUMN IF NOT EXISTS coordenador_nome TEXT;
