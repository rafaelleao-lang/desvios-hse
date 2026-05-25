-- Adiciona coluna de destinatários de e-mail por obra
ALTER TABLE obras ADD COLUMN IF NOT EXISTS destinatarios text[] DEFAULT '{}';
