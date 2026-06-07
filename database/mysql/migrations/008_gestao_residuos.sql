-- ============================================================
-- GESTÃO DE RESÍDUOS — Migração 008
-- Banco: desvios (mesmo banco principal do sistema MSE HSE)
-- Tabelas prefixadas com res_ para não conflitar com as existentes
-- IDs: VARCHAR(64) base36 (padrão do sistema)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── Tipos de resíduo ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS res_tipos (
  id             VARCHAR(64)  NOT NULL,
  nome           VARCHAR(500) NOT NULL,
  tipo_controle  VARCHAR(50)  NOT NULL DEFAULT 'cacamba',
  unidade_medida VARCHAR(100) NOT NULL DEFAULT 'caçamba',
  criado_em      VARCHAR(64)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_res_tipos_nome (nome(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Fornecedores ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS res_fornecedores (
  id        VARCHAR(64)  NOT NULL,
  nome      VARCHAR(500) NOT NULL,
  cnpj      VARCHAR(32)  DEFAULT NULL,
  contato   VARCHAR(500) DEFAULT NULL,
  endereco  TEXT         DEFAULT NULL,
  estado    VARCHAR(8)   DEFAULT NULL,
  ativo     TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em VARCHAR(64)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_res_forn_nome (nome(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Preços por fornecedor + tipo de resíduo ───────────────────────────────────
CREATE TABLE IF NOT EXISTS res_fornecedor_precos (
  id            VARCHAR(64)    NOT NULL,
  fornecedor_id VARCHAR(64)    NOT NULL,
  tipo_id       VARCHAR(64)    NOT NULL,
  descricao     VARCHAR(200)   DEFAULT NULL,
  valor         DECIMAL(12,4)  NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_rfp_forn FOREIGN KEY (fornecedor_id) REFERENCES res_fornecedores(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rfp_tipo FOREIGN KEY (tipo_id)       REFERENCES res_tipos(id)        ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY idx_rfp_lookup (fornecedor_id, tipo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Entradas de resíduos (saldos) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS res_saldos (
  id             VARCHAR(64)    NOT NULL,
  obra_id        VARCHAR(64)    NOT NULL,
  tipo_id        VARCHAR(64)    NOT NULL,
  quantidade     DECIMAL(16,4)  NOT NULL DEFAULT 0,
  unidade_medida VARCHAR(200)   NOT NULL,
  documento_url  TEXT           DEFAULT NULL,
  data           DATE           NOT NULL,
  criado_em      VARCHAR(64)    NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_rs_obra FOREIGN KEY (obra_id) REFERENCES obras(id)     ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_rs_tipo FOREIGN KEY (tipo_id) REFERENCES res_tipos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY idx_rs_obra (obra_id),
  KEY idx_rs_data (data)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Retiradas de resíduos ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS res_retiradas (
  id             VARCHAR(64)    NOT NULL,
  obra_id        VARCHAR(64)    NOT NULL,
  tipo_id        VARCHAR(64)    NOT NULL,
  fornecedor_id  VARCHAR(64)    NOT NULL,
  quantidade     DECIMAL(16,4)  NOT NULL DEFAULT 0,
  unidade_medida VARCHAR(200)   DEFAULT NULL,
  descricao_preco VARCHAR(200)  DEFAULT NULL,
  valor_unitario DECIMAL(12,4)  DEFAULT NULL,
  valor_total    DECIMAL(12,2)  DEFAULT NULL,
  foto_url       TEXT           DEFAULT NULL,
  observacoes    TEXT           DEFAULT NULL,
  data           DATE           NOT NULL,
  criado_em      VARCHAR(64)    NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_rr_obra FOREIGN KEY (obra_id)       REFERENCES obras(id)             ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_rr_tipo FOREIGN KEY (tipo_id)       REFERENCES res_tipos(id)         ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_rr_forn FOREIGN KEY (fornecedor_id) REFERENCES res_fornecedores(id)  ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY idx_rr_obra (obra_id),
  KEY idx_rr_data (data)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Solicitações de retirada ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS res_solicitacoes (
  id               VARCHAR(64)    NOT NULL,
  obra_id          VARCHAR(64)    NOT NULL,
  tipo_id          VARCHAR(64)    NOT NULL,
  quantidade       DECIMAL(16,4)  NOT NULL DEFAULT 0,
  unidade_medida   VARCHAR(200)   DEFAULT NULL,
  descricao_preco  VARCHAR(200)   DEFAULT NULL,
  valor_unitario   DECIMAL(12,4)  DEFAULT NULL,
  data_prevista    DATE           NOT NULL,
  data_solicitacao DATE           DEFAULT NULL,
  data_finalizacao VARCHAR(64)    DEFAULT NULL,
  observacoes      TEXT           DEFAULT NULL,
  status           VARCHAR(32)    NOT NULL DEFAULT 'PENDENTE',
  criado_em        VARCHAR(64)    NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_rsol_obra FOREIGN KEY (obra_id) REFERENCES obras(id)     ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_rsol_tipo FOREIGN KEY (tipo_id) REFERENCES res_tipos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY idx_rsol_obra   (obra_id),
  KEY idx_rsol_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Alertas de estoque mínimo ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS res_alertas (
  id        VARCHAR(64) NOT NULL,
  obra_id   VARCHAR(64) NOT NULL,
  tipo_id   VARCHAR(64) NOT NULL,
  minimo    INT         NOT NULL DEFAULT 0,
  emails    TEXT        DEFAULT NULL,
  ativo     TINYINT(1)  NOT NULL DEFAULT 1,
  criado_em VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_ra_obra FOREIGN KEY (obra_id) REFERENCES obras(id)     ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ra_tipo FOREIGN KEY (tipo_id) REFERENCES res_tipos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_alerta_obra_tipo (obra_id, tipo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
