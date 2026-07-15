-- ── Módulo Alojamentos ──────────────────────────────────────────────────────
-- Tabelas: alojamentos e alojamento_itens
-- Execute no HeidiSQL: abra a aba Consulta, cole este arquivo e pressione F9.

SET NAMES utf8mb4;

CREATE TABLE alojamentos (
  id                     VARCHAR(64)  NOT NULL,
  numero                 INT          NOT NULL,
  obra_id                VARCHAR(64)  NOT NULL,
  obra_nome              VARCHAR(255) DEFAULT NULL,
  endereco               VARCHAR(255) NOT NULL,
  empresa_responsavel    VARCHAR(255) NOT NULL,
  num_quartos            INT          DEFAULT NULL,
  num_banheiros          INT          DEFAULT NULL,
  num_alojados           INT          DEFAULT NULL,
  capacidade_maxima      INT          DEFAULT NULL,
  responsavel_compra     VARCHAR(255) DEFAULT NULL,
  responsavel_alojamento VARCHAR(255) DEFAULT NULL,
  responsavel_relatorio  VARCHAR(255) NOT NULL,
  data_vistoria          VARCHAR(10)  NOT NULL,
  total_itens            INT          NOT NULL DEFAULT 0,
  total_conformes        INT          NOT NULL DEFAULT 0,
  criado_em              VARCHAR(40)  NOT NULL,
  atualizado_em          VARCHAR(40)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_alojamentos_numero (numero),
  KEY idx_alojamentos_obra (obra_id),
  KEY idx_alojamentos_data (data_vistoria),
  CONSTRAINT fk_alojamentos_obra FOREIGN KEY (obra_id)
    REFERENCES obras (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE alojamento_itens (
  id             VARCHAR(64)  NOT NULL,
  alojamento_id  VARCHAR(64)  NOT NULL,
  item_key       VARCHAR(40)  NOT NULL,
  ordem          INT          NOT NULL DEFAULT 0,
  conforme       TINYINT(1)   NOT NULL DEFAULT 0,
  observacao     VARCHAR(255) DEFAULT NULL,
  fotos          JSON         DEFAULT (JSON_ARRAY()),
  criado_em      VARCHAR(40)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_itens_alojamento (alojamento_id),
  CONSTRAINT fk_itens_alojamento FOREIGN KEY (alojamento_id)
    REFERENCES alojamentos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
