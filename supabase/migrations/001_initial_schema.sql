-- ============================================================
-- PLATAFORMA HSE/SST — SCHEMA COMPLETO
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE perfil_usuario AS ENUM (
  'administrador',
  'engenheiro',
  'tecnico_sst',
  'supervisor',
  'encarregado',
  'visualizador'
);

CREATE TYPE status_desvio AS ENUM (
  'aberto',
  'em_tratativa',
  'pendente',
  'concluido',
  'fechado',
  'reincidente'
);

CREATE TYPE gravidade_desvio AS ENUM (
  'baixo',
  'medio',
  'alto',
  'critico'
);

CREATE TYPE tipo_anexo AS ENUM (
  'foto_antes',
  'foto_depois',
  'video',
  'documento',
  'outro'
);

-- ============================================================
-- TABELA: empresas
-- ============================================================

CREATE TABLE empresas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT NOT NULL,
  cnpj        TEXT,
  logo_url    TEXT,
  ativa       BOOLEAN DEFAULT TRUE,
  criado_em   TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: obras
-- ============================================================

CREATE TABLE obras (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  codigo        TEXT UNIQUE,
  endereco      TEXT,
  cidade        TEXT,
  estado        TEXT,
  responsavel   TEXT,
  data_inicio   DATE,
  data_fim      DATE,
  ativa         BOOLEAN DEFAULT TRUE,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: profiles (extende auth.users)
-- ============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL,
  telefone      TEXT,
  cargo         TEXT,
  perfil        perfil_usuario NOT NULL DEFAULT 'visualizador',
  empresa_id    UUID REFERENCES empresas(id),
  avatar_url    TEXT,
  ativo         BOOLEAN DEFAULT TRUE,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: obras_usuarios (many-to-many)
-- ============================================================

CREATE TABLE obras_usuarios (
  obra_id    UUID REFERENCES obras(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (obra_id, usuario_id)
);

-- ============================================================
-- TABELA: categorias_desvio
-- ============================================================

CREATE TABLE categorias_desvio (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT NOT NULL,
  descricao   TEXT,
  icone       TEXT,
  cor         TEXT DEFAULT '#F59E0B',
  ativa       BOOLEAN DEFAULT TRUE,
  ordem       INT DEFAULT 0
);

-- Categorias padrão HSE
INSERT INTO categorias_desvio (nome, descricao, cor, ordem) VALUES
  ('EPI/EPC',              'Uso incorreto ou ausência de equipamentos de proteção',         '#EF4444', 1),
  ('Trabalho em Altura',   'Desvios relacionados a atividades em elevação',                 '#F97316', 2),
  ('Espaço Confinado',     'Irregularidades em espaços confinados',                         '#8B5CF6', 3),
  ('Eletricidade',         'Riscos elétricos e instalações irregulares',                    '#EAB308', 4),
  ('Içamento de Cargas',   'Operações de içamento e movimentação de cargas',                '#06B6D4', 5),
  ('Ferramentas',          'Uso inadequado ou ferramentas defeituosas',                     '#84CC16', 6),
  ('Ordem e Limpeza',      'Condições de housekeeping e organização',                       '#6366F1', 7),
  ('Incêndio',             'Riscos de incêndio e sistemas de combate',                      '#DC2626', 8),
  ('Veículos',             'Operação de veículos e equipamentos móveis',                    '#0891B2', 9),
  ('Produtos Químicos',    'Manuseio e armazenamento de produtos químicos',                 '#7C3AED', 10),
  ('Comportamental',       'Comportamento inseguro de trabalhadores',                       '#DB2777', 11),
  ('Documentação',         'Ausência ou irregularidade em documentos de segurança',         '#64748B', 12),
  ('Ergonomia',            'Riscos ergonômicos e posturas inadequadas',                     '#0D9488', 13),
  ('Outros',               'Desvios não enquadrados nas categorias anteriores',             '#78716C', 14);

-- ============================================================
-- TABELA: desvios (tabela principal)
-- ============================================================

CREATE TABLE desvios (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero                SERIAL,
  obra_id               UUID NOT NULL REFERENCES obras(id),
  empresa_id            UUID REFERENCES empresas(id),
  categoria_id          UUID REFERENCES categorias_desvio(id),

  -- Localização
  setor                 TEXT,
  area                  TEXT,
  local_exato           TEXT,

  -- Classificação
  gravidade             gravidade_desvio NOT NULL DEFAULT 'medio',
  status                status_desvio NOT NULL DEFAULT 'aberto',

  -- Descrição
  descricao             TEXT NOT NULL,

  -- Datas
  data_ocorrencia       DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_ocorrencia       TIME,
  prazo_correcao        DATE,
  data_conclusao        TIMESTAMPTZ,

  -- Responsáveis
  encarregado_id        UUID REFERENCES profiles(id),
  responsavel_tratativa_id UUID REFERENCES profiles(id),
  registrado_por_id     UUID REFERENCES profiles(id),

  -- Ações
  acao_corretiva        TEXT,
  acao_preventiva       TEXT,

  -- Controle
  reincidente           BOOLEAN DEFAULT FALSE,
  desvio_origem_id      UUID REFERENCES desvios(id),

  -- Timestamps
  criado_em             TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ DEFAULT NOW(),

  -- Busca full-text
  search_vector         TSVECTOR
);

-- Índices para performance
CREATE INDEX idx_desvios_obra       ON desvios(obra_id);
CREATE INDEX idx_desvios_status     ON desvios(status);
CREATE INDEX idx_desvios_gravidade  ON desvios(gravidade);
CREATE INDEX idx_desvios_categoria  ON desvios(categoria_id);
CREATE INDEX idx_desvios_encarregado ON desvios(encarregado_id);
CREATE INDEX idx_desvios_data       ON desvios(data_ocorrencia);
CREATE INDEX idx_desvios_prazo      ON desvios(prazo_correcao);
CREATE INDEX idx_desvios_search     ON desvios USING gin(search_vector);

-- Trigger: atualiza search_vector
CREATE OR REPLACE FUNCTION update_desvio_search()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese', coalesce(NEW.descricao, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.local_exato, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.setor, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.area, '')), 'D');
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER desvio_search_update
  BEFORE INSERT OR UPDATE ON desvios
  FOR EACH ROW EXECUTE FUNCTION update_desvio_search();

-- ============================================================
-- TABELA: anexos
-- ============================================================

CREATE TABLE anexos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  desvio_id       UUID NOT NULL REFERENCES desvios(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  url             TEXT NOT NULL,
  tipo            tipo_anexo NOT NULL DEFAULT 'foto_antes',
  tamanho_bytes   BIGINT,
  mime_type       TEXT,
  enviado_por_id  UUID REFERENCES profiles(id),
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anexos_desvio ON anexos(desvio_id);

-- ============================================================
-- TABELA: tratativas
-- ============================================================

CREATE TABLE tratativas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  desvio_id       UUID NOT NULL REFERENCES desvios(id) ON DELETE CASCADE,
  autor_id        UUID REFERENCES profiles(id),
  comentario      TEXT NOT NULL,
  acao_realizada  TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tratativas_desvio ON tratativas(desvio_id);

-- ============================================================
-- TABELA: historico_status
-- ============================================================

CREATE TABLE historico_status (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  desvio_id       UUID NOT NULL REFERENCES desvios(id) ON DELETE CASCADE,
  status_anterior status_desvio,
  status_novo     status_desvio NOT NULL,
  alterado_por_id UUID REFERENCES profiles(id),
  observacao      TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_historico_desvio ON historico_status(desvio_id);

-- Trigger: registra histórico de status automaticamente
CREATE OR REPLACE FUNCTION registrar_historico_status()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO historico_status (desvio_id, status_anterior, status_novo)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER desvio_status_change
  AFTER UPDATE ON desvios
  FOR EACH ROW EXECUTE FUNCTION registrar_historico_status();

-- ============================================================
-- TABELA: notificacoes
-- ============================================================

CREATE TABLE notificacoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  desvio_id       UUID REFERENCES desvios(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,
  titulo          TEXT NOT NULL,
  mensagem        TEXT,
  lida            BOOLEAN DEFAULT FALSE,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notificacoes_usuario ON notificacoes(usuario_id);
CREATE INDEX idx_notificacoes_lida    ON notificacoes(usuario_id, lida);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras              ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE desvios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE anexos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tratativas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_status   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras_usuarios     ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: retorna perfil do usuário logado
CREATE OR REPLACE FUNCTION get_user_perfil()
RETURNS TEXT AS $$
  SELECT perfil::TEXT FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies: profiles
CREATE POLICY "profiles: usuário vê próprio perfil"
  ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles: admin vê todos"
  ON profiles FOR SELECT USING (get_user_perfil() IN ('administrador','engenheiro','tecnico_sst'));
CREATE POLICY "profiles: usuário atualiza próprio"
  ON profiles FOR UPDATE USING (id = auth.uid());

-- Policies: obras
CREATE POLICY "obras: usuário autenticado lê"
  ON obras FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "obras: admin gerencia"
  ON obras FOR ALL USING (get_user_perfil() IN ('administrador','engenheiro'));

-- Policies: empresas
CREATE POLICY "empresas: usuário autenticado lê"
  ON empresas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "empresas: admin gerencia"
  ON empresas FOR ALL USING (get_user_perfil() IN ('administrador'));

-- Policies: desvios
CREATE POLICY "desvios: autenticado lê todos"
  ON desvios FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "desvios: autenticado insere"
  ON desvios FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "desvios: responsável atualiza"
  ON desvios FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      registrado_por_id = auth.uid() OR
      encarregado_id = auth.uid() OR
      responsavel_tratativa_id = auth.uid() OR
      get_user_perfil() IN ('administrador','engenheiro','tecnico_sst','supervisor')
    )
  );

-- Policies: anexos
CREATE POLICY "anexos: autenticado lê"
  ON anexos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "anexos: autenticado insere"
  ON anexos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policies: tratativas
CREATE POLICY "tratativas: autenticado lê"
  ON tratativas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "tratativas: autenticado insere"
  ON tratativas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policies: historico
CREATE POLICY "historico: autenticado lê"
  ON historico_status FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policies: notificacoes
CREATE POLICY "notificacoes: usuário próprias"
  ON notificacoes FOR ALL USING (usuario_id = auth.uid());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('desvios-fotos', 'desvios-fotos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "fotos: público lê"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'desvios-fotos');

CREATE POLICY "fotos: autenticado envia"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'desvios-fotos' AND auth.uid() IS NOT NULL);

CREATE POLICY "fotos: autor deleta"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'desvios-fotos' AND auth.uid() IS NOT NULL);

-- ============================================================
-- FUNCTION: trigger para criar profile após signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- VIEWS ANALÍTICAS
-- ============================================================

CREATE OR REPLACE VIEW vw_desvios_completo AS
SELECT
  d.*,
  o.nome                          AS obra_nome,
  o.codigo                        AS obra_codigo,
  e.nome                          AS empresa_nome,
  cat.nome                        AS categoria_nome,
  cat.cor                         AS categoria_cor,
  p_enc.nome                      AS encarregado_nome,
  p_resp.nome                     AS responsavel_nome,
  p_reg.nome                      AS registrado_por_nome,
  EXTRACT(DAY FROM (NOW() - d.criado_em))::INT AS dias_aberto,
  CASE
    WHEN d.prazo_correcao < CURRENT_DATE
     AND d.status NOT IN ('concluido','fechado')
    THEN TRUE ELSE FALSE
  END AS vencido,
  CASE
    WHEN d.prazo_correcao IS NOT NULL
    THEN (d.prazo_correcao - CURRENT_DATE)
    ELSE NULL
  END AS dias_para_vencer
FROM desvios d
LEFT JOIN obras              o   ON o.id   = d.obra_id
LEFT JOIN empresas           e   ON e.id   = d.empresa_id
LEFT JOIN categorias_desvio  cat ON cat.id = d.categoria_id
LEFT JOIN profiles           p_enc  ON p_enc.id  = d.encarregado_id
LEFT JOIN profiles           p_resp ON p_resp.id = d.responsavel_tratativa_id
LEFT JOIN profiles           p_reg  ON p_reg.id  = d.registrado_por_id;

-- ============================================================
-- DADOS DE DEMONSTRAÇÃO
-- ============================================================

-- Empresa demo
INSERT INTO empresas (id, nome, cnpj) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Construtora Alpha S.A.', '00.000.000/0001-00'),
  ('00000000-0000-0000-0000-000000000002', 'Beta Engenharia Ltda.',  '11.111.111/0001-11');

-- Obras demo
INSERT INTO obras (id, empresa_id, nome, codigo, cidade, estado, ativa) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Obra Centro Logístico Norte', 'CLN-001', 'São Paulo', 'SP', TRUE),
  ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001', 'Obra Centro Logístico Norte', 'CLN-001', 'São Paulo', 'SP', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO obras (empresa_id, nome, codigo, cidade, estado, ativa) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Residencial Park Tower',     'RPT-002', 'Campinas',     'SP', TRUE),
  ('00000000-0000-0000-0000-000000000001', 'Viaduto Marginal Leste',     'VML-003', 'São Paulo',    'SP', TRUE),
  ('00000000-0000-0000-0000-000000000002', 'Terminal Portuário Santos',  'TPS-004', 'Santos',       'SP', TRUE),
  ('00000000-0000-0000-0000-000000000002', 'Subestação Elétrica Leste',  'SEL-005', 'Santo André',  'SP', FALSE);
