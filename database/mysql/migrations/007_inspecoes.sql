-- ── Módulo Inspeções HSE ────────────────────────────────────────────────────
-- Tabelas: inspecoes e inspecao_evidencias
-- Execute no HeidiSQL: abra a aba Consulta, cole este arquivo e pressione F9.

SET NAMES utf8mb4;

CREATE TABLE inspecoes (
  id                    VARCHAR(64)  NOT NULL,
  numero                INT          NOT NULL,
  obra_id               VARCHAR(64)  NOT NULL,
  obra_nome             VARCHAR(255) DEFAULT NULL,
  encarregado_id        VARCHAR(64)  DEFAULT NULL,
  encarregado_nome      VARCHAR(255) DEFAULT NULL,
  tst_id                VARCHAR(64)  DEFAULT NULL,
  tst_nome              VARCHAR(255) DEFAULT NULL,
  coordenador_id        VARCHAR(64)  DEFAULT NULL,
  coordenador_nome      VARCHAR(255) DEFAULT NULL,
  status                VARCHAR(20)  NOT NULL DEFAULT 'em_aberto',
  data_inspecao         VARCHAR(10)  NOT NULL,
  hora_inspecao         VARCHAR(8)   DEFAULT NULL,
  total_desvios         INT          NOT NULL DEFAULT 0,
  total_reconhecimentos INT          NOT NULL DEFAULT 0,
  desvios_fechados      INT          NOT NULL DEFAULT 0,
  criado_em             VARCHAR(40)  NOT NULL,
  atualizado_em         VARCHAR(40)  NOT NULL,
  fechado_em            VARCHAR(40)  DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inspecoes_numero (numero),
  KEY idx_inspecoes_obra (obra_id),
  KEY idx_inspecoes_status (status),
  KEY idx_inspecoes_data (data_inspecao),
  CONSTRAINT fk_inspecoes_obra FOREIGN KEY (obra_id)
    REFERENCES obras (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inspecao_evidencias (
  id                VARCHAR(64)  NOT NULL,
  inspecao_id       VARCHAR(64)  NOT NULL,
  tipo              VARCHAR(20)  NOT NULL,
  local             VARCHAR(255) NOT NULL,
  descricao         TEXT         DEFAULT NULL,
  fotos_abertura    JSON         DEFAULT (JSON_ARRAY()),
  fotos_fechamento  JSON         DEFAULT (JSON_ARRAY()),
  desvio_id         VARCHAR(64)  DEFAULT NULL,
  prazo_correcao    VARCHAR(10)  DEFAULT NULL,
  data_fechamento   VARCHAR(40)  DEFAULT NULL,
  tratativa_texto   TEXT         DEFAULT NULL,
  quem_fechou       VARCHAR(255) DEFAULT NULL,
  ordem             INT          NOT NULL DEFAULT 0,
  criado_em         VARCHAR(40)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_evidencias_inspecao (inspecao_id),
  KEY idx_evidencias_desvio (desvio_id),
  CONSTRAINT fk_evidencias_inspecao FOREIGN KEY (inspecao_id)
    REFERENCES inspecoes (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
