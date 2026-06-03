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
  'Outros':               '#78716C',
}
