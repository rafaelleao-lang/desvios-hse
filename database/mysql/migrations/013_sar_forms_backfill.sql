-- ── Backfill do forms_status (SAR) para evidências anteriores à integração ──
-- A migration 012 deu DEFAULT 'pendente' em forms_status pra TODAS as linhas
-- existentes, o que faria o bot de sincronização tentar mandar meses de
-- histórico pro forms do cliente. Este backfill marca o que já existia antes
-- da integração como 'nao_aplicavel' — só evidências novas ficam 'pendente'.
-- Execute no HeidiSQL: abra a aba Consulta, cole este arquivo e pressione F9.

SET NAMES utf8mb4;

UPDATE inspecao_evidencias
SET forms_status = 'nao_aplicavel'
WHERE forms_status = 'pendente';
