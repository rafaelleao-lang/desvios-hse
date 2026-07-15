-- ── Módulo Alojamentos — sub-unidades por item ─────────────────────────────
-- Adiciona a coluna sub_unidades em alojamento_itens, usada pelos itens
-- "Dormitórios" e "Sanitários" para guardar fotos/observação por quarto ou
-- banheiro individual (ex: Dormitório 1, Dormitório 2...), em vez de uma
-- única foto/observação genérica para o item inteiro.
-- Execute no HeidiSQL: abra a aba Consulta, cole este arquivo e pressione F9.

SET NAMES utf8mb4;

ALTER TABLE alojamento_itens
  ADD COLUMN sub_unidades JSON DEFAULT (JSON_ARRAY()) AFTER fotos;
