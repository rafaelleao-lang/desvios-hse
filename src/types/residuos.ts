export interface TipoResiduo {
  id: string
  nome: string
  tipo_controle: string
  unidade_medida: string
  criado_em: string
}

export interface FornecedorPreco {
  id: string
  fornecedor_id: string
  tipo_id: string
  tipo_nome?: string
  descricao?: string
  valor: number
}

export interface Fornecedor {
  id: string
  nome: string
  cnpj?: string
  contato?: string
  endereco?: string
  estado?: string
  ativo: boolean
  criado_em: string
  precos?: FornecedorPreco[]
}

export interface ResSaldo {
  id: string
  obra_id: string
  obra_nome?: string
  tipo_id: string
  tipo_nome?: string
  quantidade: number
  unidade_medida: string
  documento_url?: string
  data: string
  criado_em: string
}

export interface ResRetirada {
  id: string
  obra_id: string
  obra_nome?: string
  tipo_id: string
  tipo_nome?: string
  fornecedor_id: string
  fornecedor_nome?: string
  quantidade: number
  unidade_medida?: string
  descricao_preco?: string
  valor_unitario?: number
  valor_total?: number
  foto_url?: string
  observacoes?: string
  data: string
  criado_em: string
}

export interface ResSolicitacao {
  id: string
  obra_id: string
  obra_nome?: string
  tipo_id: string
  tipo_nome?: string
  quantidade: number
  unidade_medida?: string
  descricao_preco?: string
  valor_unitario?: number
  data_prevista: string
  data_solicitacao?: string
  data_finalizacao?: string
  observacoes?: string
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'
  criado_em: string
}

export interface ResAlerta {
  id: string
  obra_id: string
  obra_nome?: string
  tipo_id: string
  tipo_nome?: string
  minimo: number
  emails?: string
  ativo: boolean
  criado_em: string
  saldo_atual?: number
}

export interface SaldoObra {
  obra_id: string
  obra_nome: string
  tipo_id: string
  tipo_nome: string
  unidade_medida: string
  total_entrada: number
  total_retirada: number
  saldo: number
}
