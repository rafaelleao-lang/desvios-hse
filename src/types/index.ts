export type StatusDesvio =
  | 'aberto'
  | 'em_tratativa'
  | 'pendente'
  | 'concluido'
  | 'fechado'
  | 'reincidente'

export type GravidadeDesvio = 'baixo' | 'medio' | 'alto' | 'critico'

export interface Obra {
  id: string
  nome: string
  codigo: string
  empresa?: string
  cidade?: string
  estado?: string
  responsavel?: string
  ativa: boolean
  criado_em: string
}

export interface TST {
  id: string
  obra_id: string
  nome: string
  crea?: string
  telefone?: string
  ativo: boolean
  criado_em: string
}

export interface Encarregado {
  id: string
  obra_id: string
  nome: string
  setor?: string
  telefone?: string
  ativo: boolean
  criado_em: string
}

export interface Coordenador {
  id: string
  obra_id: string
  nome: string
  email: string
  telefone?: string
  ativo: boolean
  criado_em: string
}

export interface FotoDesvio {
  id: string
  tipo: 'antes' | 'depois'
  data_url: string
  nome: string
}

export interface Tratativa {
  id: string
  comentario: string
  autor: string
  acao_realizada?: string
  fotos?: FotoDesvio[]
  criado_em: string
}

export interface HistoricoStatus {
  id: string
  status_anterior?: StatusDesvio
  status_novo: StatusDesvio
  por: string
  observacao?: string
  criado_em: string
}

export interface Desvio {
  id: string
  numero: number
  obra_id: string
  obra_nome?: string
  categoria: string
  categoria_outro?: string
  setor?: string
  local_exato: string
  gravidade: GravidadeDesvio
  status: StatusDesvio
  descricao: string
  aberto_por: string
  colaborador_nome?: string
  encarregado_id: string
  encarregado_nome?: string
  tst_id?: string
  tst_nome?: string
  coordenador_id?: string
  coordenador_nome?: string
  data_ocorrencia: string
  hora_ocorrencia?: string
  prazo_correcao?: string
  acao_corretiva?: string
  acao_preventiva?: string
  reincidente: boolean
  fotos: FotoDesvio[]
  tratativas: Tratativa[]
  historico_status: HistoricoStatus[]
  criado_em: string
  atualizado_em: string
}

export interface DesvioComputado extends Desvio {
  vencido: boolean
  isClosed: boolean
  dias_para_vencer: number | null
  dias_aberto: number
  obra_nome_computado: string
  encarregado_nome_computado: string
  tst_nome_computado: string
  coordenador_nome_computado: string
  categorias: string[]
}

// Parses both legacy string ("EPI/EPC") and new JSON array ('["EPI/EPC","Ferramentas"]')
export function parseCategoria(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw === 'string' && raw.trim()) {
    if (raw.startsWith('[')) {
      try { return JSON.parse(raw) } catch {}
    }
    return [raw]
  }
  return []
}

// Single category → plain string; multiple → JSON array (minimizes DB changes)
export function serializeCategoria(cats: string[]): string {
  if (cats.length === 0) return ''
  if (cats.length === 1) return cats[0]
  return JSON.stringify(cats)
}

export const CATEGORIAS_PADRAO = [
  'EPI/EPC',
  'Trabalho em Altura',
  'Espaço Confinado',
  'Eletricidade',
  'Içamento de Cargas',
  'Ferramentas',
  'Ordem e Limpeza',
  'Incêndio',
  'Veículos/Equipamentos',
  'Produtos Químicos',
  'Comportamental',
  'Documentação',
  'Ergonomia',
  'Trabalho a Quente',
  'Meio Ambiente',
  'Outros',
] as const

export interface IndicadorSemanal {
  id: string
  obra_id: string
  semana: number
  ano: number
  // Efetivo
  efetivo: number
  ausentes: number
  hht_trabalhada: number
  // Documentos de segurança
  apr_realizadas: number
  pt_realizadas: number
  // Desvios
  desvios_ocorridos: number
  desvios_solucionados: number
  // Alojamentos
  alojamentos_conformes: number
  alojamentos_nao_conformes: number
  alojamentos_totais: number
  // Treinamento
  hht_semanal: number
  pessoas_treinadas: number
  dds: number
  // Incidentes
  acidentes: number
  acidente_sem_afastamento: number
  primeiros_socorros: number
  quase_acidentes: number
  danos_materiais: number
  // Outros
  campanhas: number
  inspecoes_semanais: number
  observacoes?: string
  criado_em: string
  atualizado_em: string
}

// ── Inspeções HSE ─────────────────────────────────────────────────────────────

export type StatusInspecao = 'em_aberto' | 'concluida'
export type TipoEvidencia = 'desvio' | 'reconhecimento'
// 'nao_aplicavel' = evidência anterior à integração com o forms SAR (backfill), nunca sincronizada
export type StatusEnvioForms = 'pendente' | 'enviado' | 'erro' | 'nao_aplicavel'
export type OrigemSar = 'comportamento' | 'boas_praticas' | 'condicao'

// Obras do cliente Novo Nordisk — únicas onde o forms SAR se aplica hoje
export const OBRAS_NN_IDS = ['mpgtfln4velildphgw', 'mpgti8oi0eaqvgbclzfd'] as const

// Zonas do site Novo Nordisk — dropdown "Local" do forms SAR (See-Act-Report)
export const LOCAIS_SAR_PADRAO = [
  'ADM I', 'ADM II', 'ALMOXARIFADO', 'AMBULATÓRIO', 'AP I', 'AP II',
  'ÁREAS EXTERNAS', 'CANTEIRO PRÓXIMO AO REFEITÓRIO', 'CENTRAL', 'DATACENTER',
  'DATACENTER D21', 'ELEVATÓRIA', 'ESTACIONAMENTO I/II', 'ESTACIONAMENTO III',
  'LAVA RODAS', 'LOB', 'PORTARIA', 'QC', 'REFEITÓRIO ADM', 'RESERVATÓRIO',
  'SALA DE TREINAMENTO', 'SANTO AGOSTINHO', 'SPINE', 'UB',
  'VESTIÁRIO FEMININO', 'VESTIÁRIO MASCULINO', 'WAREHOUSE',
] as const

export const ORIGENS_SAR_PADRAO: { value: OrigemSar; label: string }[] = [
  { value: 'comportamento', label: 'Comportamento' },
  { value: 'boas_praticas', label: 'Boas Práticas' },
  { value: 'condicao', label: 'Condição' },
]

export const DISCIPLINAS_SAR_PADRAO = ['Saúde', 'Segurança', 'Meio Ambiente'] as const

export const RISCOS_ASSOCIADOS_SAR_PADRAO = [
  'Documento/requisito',
  'Organização e limpeza',
  'Biológico - Material biológico',
  'Ergonômico - Empurrar e puxar',
  'Ergonômico - Iluminação',
  'Ergonômico - Levantamento',
  'Ergonômico - Postura e posição de trabalho',
  'Ergonômico - Qualidade do ar',
  'Ergonômico - Trabalho repetitivo',
  'Físico - Ausência de oxigênio',
  'Físico - Temperaturas extremas/condição climática',
  'Físico - Corte',
  'Físico - Radiação',
  'Físico - Ruído',
  'Físico - Vibração',
  'Químico - Exposição a produto químico',
  'Químico - Gases tóxicos',
  'Segurança - Colisão, prensamento e esmagamento',
  'Segurança - Escorregões, tropeços e quedas',
  'Segurança - Trabalho em altura',
  'Segurança - Corrente elétrica',
  'Segurança - Içamento/movimentação de cargas',
  'Segurança - Projeção/queda de material',
  'Segurança - Fogo/incêndio',
  'Segurança - Trânsito',
  'Meio Ambiente - Contaminação/poluição',
  'Meio Ambiente - Segregação de resíduo',
  'Meio Ambiente - Destinação de resíduo',
  'Meio Ambiente - Umectação',
  'Meio Ambiente - Desperdício',
] as const

export interface InspecaoEvidencia {
  id: string
  inspecao_id: string
  tipo: TipoEvidencia
  local: string
  descricao?: string
  fotos_abertura: FotoDesvio[]
  fotos_fechamento: FotoDesvio[]
  desvio_id?: string
  prazo_correcao?: string
  data_fechamento?: string
  tratativa_texto?: string
  quem_fechou?: string
  ordem: number
  criado_em: string
  // Campos exigidos pelo forms SAR do cliente (Novo Nordisk — See/Act/Report)
  subcategoria_local?: string
  origem?: OrigemSar
  disciplina?: string
  risco_associado?: string
  acoes_tomadas?: string
  eliminou_risco?: boolean
  forms_status: StatusEnvioForms
  forms_enviado_em?: string
  forms_erro?: string
}

export interface Inspecao {
  id: string
  numero: number
  obra_id: string
  obra_nome?: string
  encarregado_id?: string
  encarregado_nome?: string
  tst_id?: string
  tst_nome?: string
  coordenador_id?: string
  coordenador_nome?: string
  status: StatusInspecao
  data_inspecao: string
  hora_inspecao?: string
  total_desvios: number
  total_reconhecimentos: number
  desvios_fechados: number
  criado_em: string
  atualizado_em: string
  fechado_em?: string
  evidencias?: InspecaoEvidencia[]
}

export const CATEGORIAS_CORES: Record<string, string> = {
  'EPI/EPC':              '#EF4444',
  'Trabalho em Altura':   '#F97316',
  'Espaço Confinado':     '#8B5CF6',
  'Eletricidade':         '#EAB308',
  'Içamento de Cargas':   '#06B6D4',
  'Ferramentas':          '#84CC16',
  'Ordem e Limpeza':      '#6366F1',
  'Incêndio':             '#DC2626',
  'Veículos/Equipamentos':'#0891B2',
  'Produtos Químicos':    '#7C3AED',
  'Comportamental':       '#DB2777',
  'Documentação':         '#64748B',
  'Ergonomia':            '#0D9488',
  'Trabalho a Quente':   '#EF4444',
  'Meio Ambiente':        '#22C55E',
  'Outros':               '#78716C',
}
