export interface TipoResiduo {
  id: string
  nome: string
  tipo_controle: string
  unidade_medida: string
  created_at: string
}

export interface Fornecedor {
  id: string
  nome: string
  cnpj?: string
  contato?: string
  endereco?: string
  estado?: string
  status: 'ATIVO' | 'INATIVO'
  created_at: string
  precos?: FornecedorResiduo[]
}

export interface FornecedorResiduo {
  id: string
  fornecedor_id: string
  residuo_id: string
  residuo_nome?: string
  descricao?: string
  valor: number
}

export interface Saldo {
  id: string
  obra_id: string
  obra_nome?: string
  residuo_id: string
  residuo_nome?: string
  quantidade: number
  unidade_medida: string
  documento_url?: string
  data: string
  created_at: string
}

export interface Retirada {
  id: string
  obra_id: string
  obra_nome?: string
  residuo_id: string
  residuo_nome?: string
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
  created_at: string
}

export interface Solicitacao {
  id: string
  obra_id: string
  obra_nome?: string
  residuo_id: string
  residuo_nome?: string
  quantidade: number
  unidade_medida?: string
  descricao_preco?: string
  valor_unitario?: number
  data_prevista: string
  data_solicitacao?: string
  data_finalizacao?: string
  observacoes?: string
  status: 'PENDENTE' | 'APROVADA' | 'RECUSADA' | 'CONCLUIDA'
  created_at: string
}

export interface AlertaEstoque {
  id: string
  obra_id: string
  obra_nome?: string
  residuo_id: string
  residuo_nome?: string
  minimo: number
  emails?: string
  ativo: boolean
  created_at: string
  saldo_atual?: number
}

export interface SaldoObra {
  obra_id: string
  residuo_id: string
  residuo_nome: string
  unidade_medida: string
  total_entrada: number
  total_retirada: number
  saldo: number
}
