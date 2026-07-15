-- ── Módulo Alojamentos — Cadastro de Alojamentos + vigência do relatório ───
-- Tabela alojamento_locais: cadastro do alojamento físico (Obra + Endereço).
-- Colunas novas em alojamentos: alojamento_local_id (vincula o relatório ao
-- alojamento cadastrado) e prazo_resolucao (prazo para resolver as não
-- conformidades, definido no momento em que o relatório é salvo).
-- Execute no HeidiSQL: abra a aba Consulta, cole este arquivo e pressione F9.

SET NAMES utf8mb4;

CREATE TABLE alojamento_locais (
  id            VARCHAR(64)  NOT NULL,
  obra_id       VARCHAR(64)  NOT NULL,
  obra_nome     VARCHAR(255) DEFAULT NULL,
  endereco      VARCHAR(255) NOT NULL,
  criado_em     VARCHAR(40)  NOT NULL,
  atualizado_em VARCHAR(40)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_alojamento_locais_obra (obra_id),
  CONSTRAINT fk_alojamento_locais_obra FOREIGN KEY (obra_id)
    REFERENCES obras (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE alojamentos
  ADD COLUMN alojamento_local_id VARCHAR(64) DEFAULT NULL AFTER obra_nome,
  ADD COLUMN prazo_resolucao     VARCHAR(10) DEFAULT NULL AFTER data_vistoria,
  ADD KEY idx_alojamentos_local (alojamento_local_id),
  ADD CONSTRAINT fk_alojamentos_local FOREIGN KEY (alojamento_local_id)
    REFERENCES alojamento_locais (id) ON DELETE SET NULL ON UPDATE CASCADE;
