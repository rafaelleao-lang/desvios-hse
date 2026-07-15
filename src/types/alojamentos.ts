// ── Módulo Alojamentos ──────────────────────────────────────────────────────

export interface FotoAlojamento {
  id: string
  data_url: string
  nome: string
}

export interface AlojamentoClausula {
  ref: string
  desc: string
}

// 11 itens fixos de vistoria (adaptado do relatório original de Alojamentos).
// A ordem e as chaves (item_key) não devem mudar — são usadas para casar com
// os registros já salvos no banco. Cada item traz uma lista de cláusulas
// normativas (código + descrição), exibida como lista, não como texto corrido.
export const ALOJAMENTO_ITENS_CONFIG = [
  {
    key: 'estrutura',
    numero: 1,
    titulo: 'Estrutura',
    clausulas: [
      { ref: '18.4.2.10.1', desc: 'Paredes de alvenaria, madeira ou material equivalente; piso de concreto, cimentado, madeira ou equivalente; cobertura que proteja das intempéries; ventilação mínima de 1/10 da área do piso; iluminação natural e/ou artificial; não pode estar no subsolo ou em porões.' },
    ],
  },
  {
    key: 'sanitarios',
    numero: 2,
    titulo: 'Sanitários',
    clausulas: [
      { ref: '24.3.6',  desc: 'Chuveiros individuais e higiênicos, com portas, água quente/fria, piso impermeável, suporte para sabonete e toalha — dimensões mínimas de 0,80m x 0,80m.' },
      { ref: '4.1.2',   desc: 'Bacia sanitária com assento (1 para cada 10 alojados), lavatório, produtos de higiene e papel para enxugo.' },
      { ref: '24.2.3',  desc: 'Instalações limpas, conservadas, impermeáveis, com peças íntegras, ventilação, água canalizada e esgoto adequado.' },
      { ref: '24.7.2',  desc: 'Proporção de 1 chuveiro para cada 10 trabalhadores.' },
      { ref: '24.7.9',  desc: 'Higienização diária, sem fogão nos quartos e com controle de vetores.' },
    ],
  },
  {
    key: 'dormitorios',
    numero: 3,
    titulo: 'Dormitórios',
    clausulas: [
      { ref: '24.7.3',     desc: 'Camas correspondentes ao número de alojados no quarto (vedado o uso de 3 ou mais camas na mesma vertical), com espaçamento vertical e horizontal seguro; colchões certificados pelo INMETRO; colchões, lençóis, fronhas, cobertores e travesseiros limpos, higienizados e adequados ao clima; ventilação natural utilizada em conjunto com a artificial; capacidade máxima de 8 trabalhadores por quarto; armários; mínimo de 3,00 m² por cama simples ou 4,50 m² por beliche (incluída a área de circulação e armário); conforto acústico conforme NR-17.' },
      { ref: '24.7.3.1.1', desc: 'As camas superiores dos beliches devem ter proteção lateral e escada fixas à estrutura.' },
      { ref: '24.7.3.2',   desc: 'Os armários dos quartos devem ter sistema de trancamento, com dimensões compatíveis para a guarda de roupas, pertences pessoais e enxoval de cama.' },
      { ref: '24.7.4',     desc: 'Os trabalhadores alojados no mesmo quarto devem pertencer, preferencialmente, ao mesmo turno de trabalho.' },
      { ref: '24.7.5.2',   desc: 'É vedado o preparo de qualquer tipo de alimento dentro dos quartos.' },
      { ref: '4.3.3',      desc: 'Tomadas na proporção mínima de 1 para cada 2 camas.' },
      { ref: '4.3.2.4',    desc: 'Distância mínima entre camas de 0,80m.' },
    ],
  },
  {
    key: 'instalacoes_eletricas',
    numero: 4,
    titulo: 'Instalações Elétricas',
    clausulas: [
      { ref: '24.9.7.2', desc: 'Instalações protegidas contra choques elétricos.' },
      { ref: '4.3.4',    desc: 'Fiações protegidas, sem improvisos ou uso de benjamim.' },
    ],
  },
  {
    key: 'limpeza_organizacao',
    numero: 5,
    titulo: 'Limpeza e Organização',
    clausulas: [
      { ref: '24.7.2', desc: 'Alojamento mantido em condições adequadas de conservação, higiene e limpeza.' },
    ],
  },
  {
    key: 'lazer',
    numero: 6,
    titulo: 'Lazer',
    clausulas: [
      { ref: '4.7.2', desc: 'Disponibilidade de televisores ou acesso à internet (Wi-Fi).' },
    ],
  },
  {
    key: 'extintor',
    numero: 7,
    titulo: 'Extintor',
    clausulas: [
      { ref: '4.8.6', desc: 'Existência de aparelhos extintores disponíveis no local.' },
    ],
  },
  {
    key: 'norma_interna',
    numero: 8,
    titulo: 'Norma Interna',
    clausulas: [
      { ref: 'Sinalização', desc: 'Placas de sinalização com regras gerais do alojamento e aviso de Proibido Fumar.' },
    ],
  },
  {
    key: 'cozinha',
    numero: 9,
    titulo: 'Cozinha',
    clausulas: [
      { ref: '18.5.6',   desc: 'Fornecimento obrigatório de água potável, filtrada e fresca — proporção de 1 unidade para cada 25 trabalhadores.' },
      { ref: '24.5.2.1', desc: 'Meios para conservação e aquecimento de refeições, local para lavagem de utensílios, água potável e recipientes com tampa para descarte.' },
      { ref: '24.5.2',   desc: 'Locais arejados, conservados, limpos e higiênicos, com assentos e mesas/balcões suficientes.' },
    ],
  },
  {
    key: 'lavanderia',
    numero: 10,
    titulo: 'Lavanderia',
    clausulas: [
      { ref: '24.7.6', desc: 'Locais e infraestrutura para lavagem e secagem de roupas pessoais, ou serviço de lavanderia fornecido.' },
    ],
  },
  {
    key: 'dedetizacao',
    numero: 11,
    titulo: 'Dedetização',
    clausulas: [
      { ref: '24.7.9.c', desc: 'Controle de vetores conforme legislação local.' },
    ],
  },
] as const

export type AlojamentoItemKey = typeof ALOJAMENTO_ITENS_CONFIG[number]['key']

export interface AlojamentoItem {
  id: string
  alojamento_id: string
  item_key: AlojamentoItemKey
  ordem: number
  conforme: boolean
  observacao?: string
  fotos: FotoAlojamento[]
}

export interface Alojamento {
  id: string
  numero: number
  obra_id: string
  obra_nome?: string
  endereco: string
  empresa_responsavel: string
  num_quartos?: number
  num_banheiros?: number
  num_alojados?: number
  capacidade_maxima?: number
  responsavel_compra?: string
  responsavel_alojamento?: string
  responsavel_relatorio: string
  data_vistoria: string
  total_itens: number
  total_conformes: number
  criado_em: string
  atualizado_em: string
  itens?: AlojamentoItem[]
}

export interface AlojamentoItemStats {
  item_key: AlojamentoItemKey
  total: number
  nao_conformes: number
}

export function generateAlojamentoId(numero: number): string {
  return `ALJ-${String(numero).padStart(4, '0')}`
}
