-- Adiciona campo de nome do colaborador envolvido no desvio
ALTER TABLE desvios ADD COLUMN IF NOT EXISTS colaborador_nome TEXT;
