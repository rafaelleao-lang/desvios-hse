-- ── Obras ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS obras (
  id           TEXT PRIMARY KEY,
  nome         TEXT NOT NULL,
  codigo       TEXT NOT NULL,
  empresa      TEXT,
  cidade       TEXT,
  estado       TEXT,
  responsavel  TEXT,
  ativa        BOOLEAN NOT NULL DEFAULT true,
  criado_em    TEXT NOT NULL
);

-- ── TSTs ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tsts (
  id       TEXT PRIMARY KEY,
  obra_id  TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome     TEXT NOT NULL,
  crea     TEXT,
  telefone TEXT,
  ativo    BOOLEAN NOT NULL DEFAULT true,
  criado_em TEXT NOT NULL
);

-- ── Encarregados ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS encarregados (
  id        TEXT PRIMARY KEY,
  obra_id   TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nome      TEXT NOT NULL,
  setor     TEXT,
  telefone  TEXT,
  ativo     BOOLEAN NOT NULL DEFAULT true,
  criado_em TEXT NOT NULL
);

-- ── Desvios ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS desvios (
  id                TEXT PRIMARY KEY,
  numero            INTEGER NOT NULL,
  obra_id           TEXT NOT NULL,
  obra_nome         TEXT,
  categoria         TEXT NOT NULL,
  categoria_outro   TEXT,
  setor             TEXT,
  local_exato       TEXT NOT NULL,
  gravidade         TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'aberto',
  descricao         TEXT NOT NULL,
  aberto_por        TEXT NOT NULL,
  encarregado_id    TEXT NOT NULL,
  encarregado_nome  TEXT,
  tst_id            TEXT,
  tst_nome          TEXT,
  data_ocorrencia   TEXT NOT NULL,
  hora_ocorrencia   TEXT,
  prazo_correcao    TEXT,
  acao_corretiva    TEXT,
  acao_preventiva   TEXT,
  reincidente       BOOLEAN NOT NULL DEFAULT false,
  fotos             JSONB NOT NULL DEFAULT '[]',
  tratativas        JSONB NOT NULL DEFAULT '[]',
  historico_status  JSONB NOT NULL DEFAULT '[]',
  criado_em         TEXT NOT NULL,
  atualizado_em     TEXT NOT NULL
);

-- ── Disable RLS (internal tool, no auth) ────────────────────────────────────
ALTER TABLE obras        DISABLE ROW LEVEL SECURITY;
ALTER TABLE tsts         DISABLE ROW LEVEL SECURITY;
ALTER TABLE encarregados DISABLE ROW LEVEL SECURITY;
ALTER TABLE desvios      DISABLE ROW LEVEL SECURITY;
