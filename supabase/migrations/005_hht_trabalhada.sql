-- Adiciona campo HHT Hora Homem Trabalhada na seção Efetivo
ALTER TABLE indicadores_semanais
  ADD COLUMN IF NOT EXISTS hht_trabalhada DECIMAL(10,0) NOT NULL DEFAULT 0;
