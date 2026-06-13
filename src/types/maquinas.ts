export type TipoEquipamento =
  | 'pemt'
  | 'empilhadeira'
  | 'caminhao'
  | 'guindauto'
  | 'manipuladora'
  | 'retroescavadeira'

export const TIPO_EQUIPAMENTO_LABEL: Record<TipoEquipamento, string> = {
  pemt: 'PEMT',
  empilhadeira: 'Empilhadeira',
  caminhao: 'Caminhão',
  guindauto: 'Guindauto / Munck',
  manipuladora: 'Manipuladora',
  retroescavadeira: 'Retroescavadeira',
}

export const TIPO_EQUIPAMENTO_ICON: Record<TipoEquipamento, string> = {
  pemt: '🏗️',
  empilhadeira: '🚜',
  caminhao: '🚛',
  guindauto: '🏗️',
  manipuladora: '🚧',
  retroescavadeira: '⛏️',
}

export type StatusItemChecklist = 'conforme' | 'nao_conforme' | 'nao_aplicavel' | null

export interface ChecklistItemME {
  id: string
  categoria: string
  descricao: string
}

export interface ChecklistRespostaME {
  item_id: string
  status: StatusItemChecklist
  obs?: string
  foto_url?: string
}

export interface Equipamento {
  id: string
  obra_id: string
  tipo: TipoEquipamento
  nome: string
  fabricante?: string
  modelo?: string
  numero_serie?: string
  ano_fabricacao?: number
  placa?: string
  ativo: boolean
  criado_em: string
}

export type StatusInspecaoME = 'em_andamento' | 'concluida'
export type ResultadoInspecaoME = 'aprovado' | 'reprovado' | null

export interface InspecaoMaquina {
  id: string
  numero: number
  obra_id: string
  obra_nome?: string
  equipamento_id: string
  equipamento_nome?: string
  equipamento_tipo?: TipoEquipamento
  equipamento_serie?: string
  tst_id?: string
  tst_nome?: string
  status: StatusInspecaoME
  resultado: ResultadoInspecaoME
  data_inspecao: string
  total_conformes: number
  total_nao_conformes: number
  total_nao_aplicaveis: number
  equipamento_liberado: boolean
  assinatura_url?: string
  respostas: ChecklistRespostaME[]
  desvio_id?: string
  criado_em: string
  atualizado_em: string
}
