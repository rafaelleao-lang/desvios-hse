-- ── Integração Inspeções → SAR (See-Act-Report) do cliente Novo Nordisk ─────
-- Colunas novas em inspecao_evidencias para os campos do Microsoft Forms SAR
-- que não têm equivalente hoje, e o rastreio de sincronização
-- (forms_status/forms_enviado_em/forms_erro) usado pelo bot de sincronização.
-- Execute no HeidiSQL: abra a aba Consulta, cole este arquivo e pressione F9.

SET NAMES utf8mb4;

ALTER TABLE inspecao_evidencias
  ADD COLUMN subcategoria_local  VARCHAR(255) DEFAULT NULL AFTER local,
  ADD COLUMN origem              VARCHAR(20)  DEFAULT NULL AFTER subcategoria_local,
  ADD COLUMN disciplina          TEXT         DEFAULT NULL AFTER origem,
  ADD COLUMN risco_associado     VARCHAR(60)  DEFAULT NULL AFTER disciplina,
  ADD COLUMN acoes_tomadas       TEXT         DEFAULT NULL AFTER risco_associado,
  ADD COLUMN eliminou_risco      TINYINT(1)   DEFAULT NULL AFTER acoes_tomadas,
  ADD COLUMN forms_status        VARCHAR(20)  NOT NULL DEFAULT 'pendente' AFTER eliminou_risco,
  ADD COLUMN forms_enviado_em    VARCHAR(40)  DEFAULT NULL AFTER forms_status,
  ADD COLUMN forms_erro          TEXT         DEFAULT NULL AFTER forms_enviado_em,
  ADD KEY idx_evidencias_forms_status (forms_status);
