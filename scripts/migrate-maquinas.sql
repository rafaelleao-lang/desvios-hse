-- ── Módulo Inspeções de Máquinas e Equipamentos ──────────────────────────────
-- Rodar no RDS: mysql -h <host> -u <user> -p desvios < migrate-maquinas.sql

CREATE TABLE IF NOT EXISTS equipamentos (
  id            VARCHAR(24)  NOT NULL PRIMARY KEY,
  obra_id       VARCHAR(24)  NOT NULL,
  tipo          ENUM('pemt','empilhadeira','caminhao','guindauto','manipuladora','retroescavadeira') NOT NULL,
  nome          VARCHAR(200) NOT NULL,
  fabricante    VARCHAR(100),
  modelo        VARCHAR(100),
  numero_serie  VARCHAR(100),
  ano_fabricacao SMALLINT UNSIGNED,
  placa         VARCHAR(20),
  ativo         TINYINT(1)  NOT NULL DEFAULT 1,
  criado_em     VARCHAR(30) NOT NULL,
  INDEX idx_eq_obra  (obra_id),
  INDEX idx_eq_tipo  (tipo),
  INDEX idx_eq_serie (numero_serie)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inspecoes_maquinas (
  id                   VARCHAR(24) NOT NULL PRIMARY KEY,
  numero               INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE,
  obra_id              VARCHAR(24) NOT NULL,
  obra_nome            VARCHAR(200),
  equipamento_id       VARCHAR(24) NOT NULL,
  equipamento_nome     VARCHAR(200),
  equipamento_tipo     VARCHAR(30),
  equipamento_serie    VARCHAR(100),
  tst_id               VARCHAR(24),
  tst_nome             VARCHAR(200),
  status               ENUM('em_andamento','concluida') NOT NULL DEFAULT 'concluida',
  resultado            ENUM('aprovado','reprovado'),
  data_inspecao        DATE NOT NULL,
  total_conformes      INT NOT NULL DEFAULT 0,
  total_nao_conformes  INT NOT NULL DEFAULT 0,
  total_nao_aplicaveis INT NOT NULL DEFAULT 0,
  equipamento_liberado TINYINT(1) NOT NULL DEFAULT 1,
  assinatura_url       TEXT,
  respostas            LONGTEXT,
  desvio_id            VARCHAR(24),
  criado_em            VARCHAR(30) NOT NULL,
  atualizado_em        VARCHAR(30) NOT NULL,
  INDEX idx_insp_me_obra  (obra_id),
  INDEX idx_insp_me_eq    (equipamento_id),
  INDEX idx_insp_me_data  (data_inspecao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
