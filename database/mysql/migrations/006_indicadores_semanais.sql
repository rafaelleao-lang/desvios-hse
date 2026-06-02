-- ============================================================
-- Migration 006 — INDICADORES HSE SEMANAIS (MySQL)
-- Cria a tabela sem recriar/derrubar as demais.
-- Equivalente MySQL das migrations 004/005 (Postgres/Supabase).
-- ============================================================

CREATE TABLE IF NOT EXISTS indicadores_semanais (
  id                        VARCHAR(64)   NOT NULL,
  obra_id                   VARCHAR(64)   NOT NULL,
  semana                    INT           NOT NULL,
  ano                       INT           NOT NULL,
  efetivo                   INT           NOT NULL DEFAULT 0,
  ausentes                  INT           NOT NULL DEFAULT 0,
  hht_trabalhada            DECIMAL(10,0) NOT NULL DEFAULT 0,
  apr_realizadas            INT           NOT NULL DEFAULT 0,
  pt_realizadas             INT           NOT NULL DEFAULT 0,
  desvios_ocorridos         INT           NOT NULL DEFAULT 0,
  desvios_solucionados      INT           NOT NULL DEFAULT 0,
  alojamentos_conformes     INT           NOT NULL DEFAULT 0,
  alojamentos_nao_conformes INT           NOT NULL DEFAULT 0,
  alojamentos_totais        INT           NOT NULL DEFAULT 0,
  hht_semanal               DECIMAL(10,1) NOT NULL DEFAULT 0,
  pessoas_treinadas         INT           NOT NULL DEFAULT 0,
  dds                       INT           NOT NULL DEFAULT 0,
  acidentes                 INT           NOT NULL DEFAULT 0,
  acidente_sem_afastamento  INT           NOT NULL DEFAULT 0,
  primeiros_socorros        INT           NOT NULL DEFAULT 0,
  quase_acidentes           INT           NOT NULL DEFAULT 0,
  danos_materiais           INT           NOT NULL DEFAULT 0,
  campanhas                 INT           NOT NULL DEFAULT 0,
  inspecoes_semanais        INT           NOT NULL DEFAULT 0,
  observacoes               TEXT          DEFAULT NULL,
  criado_em                 VARCHAR(40)   NOT NULL,
  atualizado_em             VARCHAR(40)   NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_indicadores_obra_semana_ano (obra_id, semana, ano),
  KEY idx_indicadores_ano (ano),
  CONSTRAINT fk_indicadores_obra FOREIGN KEY (obra_id)
    REFERENCES obras (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
