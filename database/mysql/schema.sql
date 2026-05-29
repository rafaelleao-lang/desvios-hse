-- ============================================================
-- DESVIOS HSE — SCHEMA MySQL 8
-- Banco: desvios
-- Adaptado do schema original (Supabase/PostgreSQL) para MySQL.
-- Tipos JSON usados para fotos/tratativas/historico_status/destinatarios.
-- IDs e timestamps em VARCHAR para refletir os valores gerados pela app
-- (uid base36 e datas em ISO-8601), iguais aos CSVs exportados.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS desvios;
DROP TABLE IF EXISTS encarregados;
DROP TABLE IF EXISTS tsts;
DROP TABLE IF EXISTS obras;

SET FOREIGN_KEY_CHECKS = 1;

-- ── Obras ──────────────────────────────────────────────────────────────────
CREATE TABLE obras (
  id            VARCHAR(64)  NOT NULL,
  nome          VARCHAR(255) NOT NULL,
  codigo        VARCHAR(100) NOT NULL,
  empresa       VARCHAR(255) DEFAULT NULL,
  cidade        VARCHAR(255) DEFAULT NULL,
  estado        VARCHAR(10)  DEFAULT NULL,
  responsavel   VARCHAR(255) DEFAULT NULL,
  ativa         TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em     VARCHAR(40)  NOT NULL,
  destinatarios JSON         DEFAULT (JSON_ARRAY()),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── TSTs ───────────────────────────────────────────────────────────────────
CREATE TABLE tsts (
  id        VARCHAR(64)  NOT NULL,
  obra_id   VARCHAR(64)  NOT NULL,
  nome      VARCHAR(255) NOT NULL,
  crea      VARCHAR(100) DEFAULT NULL,
  telefone  VARCHAR(50)  DEFAULT NULL,
  ativo     TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em VARCHAR(40)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_tsts_obra (obra_id),
  CONSTRAINT fk_tsts_obra FOREIGN KEY (obra_id)
    REFERENCES obras (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Encarregados ───────────────────────────────────────────────────────────
CREATE TABLE encarregados (
  id        VARCHAR(64)  NOT NULL,
  obra_id   VARCHAR(64)  NOT NULL,
  nome      VARCHAR(255) NOT NULL,
  setor     VARCHAR(255) DEFAULT NULL,
  telefone  VARCHAR(50)  DEFAULT NULL,
  ativo     TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em VARCHAR(40)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_encarregados_obra (obra_id),
  CONSTRAINT fk_encarregados_obra FOREIGN KEY (obra_id)
    REFERENCES obras (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Desvios ────────────────────────────────────────────────────────────────
CREATE TABLE desvios (
  id                VARCHAR(64)  NOT NULL,
  numero            INT          NOT NULL,
  obra_id           VARCHAR(64)  NOT NULL,
  obra_nome         VARCHAR(255) DEFAULT NULL,
  categoria         TEXT         NOT NULL,
  categoria_outro   VARCHAR(255) DEFAULT NULL,
  setor             VARCHAR(255) DEFAULT NULL,
  local_exato       TEXT         NOT NULL,
  gravidade         VARCHAR(20)  NOT NULL DEFAULT 'medio',
  status            VARCHAR(20)  NOT NULL DEFAULT 'aberto',
  descricao         TEXT         NOT NULL,
  aberto_por        VARCHAR(255) NOT NULL,
  colaborador_nome  VARCHAR(255) DEFAULT NULL,
  encarregado_id    VARCHAR(64)  NOT NULL,
  encarregado_nome  VARCHAR(255) DEFAULT NULL,
  tst_id            VARCHAR(64)  DEFAULT NULL,
  tst_nome          VARCHAR(255) DEFAULT NULL,
  data_ocorrencia   VARCHAR(10)  NOT NULL,
  hora_ocorrencia   VARCHAR(8)   DEFAULT NULL,
  prazo_correcao    VARCHAR(10)  DEFAULT NULL,
  acao_corretiva    TEXT         DEFAULT NULL,
  acao_preventiva   TEXT         DEFAULT NULL,
  reincidente       TINYINT(1)   NOT NULL DEFAULT 0,
  fotos             JSON         DEFAULT (JSON_ARRAY()),
  tratativas        JSON         DEFAULT (JSON_ARRAY()),
  historico_status  JSON         DEFAULT (JSON_ARRAY()),
  criado_em         VARCHAR(40)  NOT NULL,
  atualizado_em     VARCHAR(40)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_desvios_numero (numero),
  KEY idx_desvios_obra (obra_id),
  KEY idx_desvios_status (status),
  KEY idx_desvios_gravidade (gravidade),
  KEY idx_desvios_encarregado (encarregado_id),
  KEY idx_desvios_data (data_ocorrencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
