import type {
  TipoResiduo, Fornecedor, FornecedorPreco,
  ResSaldo, ResRetirada, ResSolicitacao, ResAlerta, SaldoObra,
} from '@/types/residuos'

async function rpc<T>(resource: string, action: string, ...args: unknown[]): Promise<T> {
  const res = await fetch('/api/residuos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource, action, args }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `Falha na operação ${resource}.${action}`)
  }
  return json.data as T
}

export const tiposDB = {
  list:   (): Promise<TipoResiduo[]>             => rpc('tipos', 'list'),
  find:   (id: string): Promise<TipoResiduo>     => rpc('tipos', 'find', id),
  create: (data: Omit<TipoResiduo, 'id' | 'criado_em'>): Promise<TipoResiduo> =>
    rpc('tipos', 'create', data),
  update: (id: string, data: Partial<Omit<TipoResiduo, 'id' | 'criado_em'>>): Promise<void> =>
    rpc('tipos', 'update', id, data),
  delete: (id: string): Promise<void>            => rpc('tipos', 'delete', id),
}

export const fornecedoresDB = {
  list:        (): Promise<Fornecedor[]>           => rpc('fornecedores', 'list'),
  find:        (id: string): Promise<Fornecedor>   => rpc('fornecedores', 'find', id),
  create:      (data: Omit<Fornecedor, 'id' | 'criado_em' | 'precos'>): Promise<Fornecedor> =>
    rpc('fornecedores', 'create', data),
  update:      (id: string, data: Partial<Omit<Fornecedor, 'id' | 'criado_em' | 'precos'>>): Promise<void> =>
    rpc('fornecedores', 'update', id, data),
  toggleAtivo: (id: string): Promise<void>         => rpc('fornecedores', 'toggleAtivo', id),
  delete:      (id: string): Promise<void>          => rpc('fornecedores', 'delete', id),
  setPrecos:   (fornecedorId: string, precos: Array<{ tipo_id: string; descricao?: string; valor: number }>): Promise<void> =>
    rpc('fornecedores', 'setPrecos', fornecedorId, precos),
}

export const saldosDB = {
  list:          (obraId?: string): Promise<ResSaldo[]>  => rpc('saldos', 'list', obraId),
  insert:        (data: Omit<ResSaldo, 'id' | 'criado_em' | 'obra_nome' | 'tipo_nome'>): Promise<ResSaldo> =>
    rpc('saldos', 'insert', data),
  delete:        (id: string): Promise<void>              => rpc('saldos', 'delete', id),
  saldosPorObra: (): Promise<SaldoObra[]>                 => rpc('saldos', 'saldosPorObra'),
}

export const retiradasDB = {
  list:       (obraId?: string): Promise<ResRetirada[]>  => rpc('retiradas', 'list', obraId),
  insert:     (data: Omit<ResRetirada, 'id' | 'criado_em' | 'obra_nome' | 'tipo_nome' | 'fornecedor_nome'>): Promise<ResRetirada> =>
    rpc('retiradas', 'insert', data),
  delete:     (id: string): Promise<void>                 => rpc('retiradas', 'delete', id),
  totalValor: (): Promise<number>                          => rpc('retiradas', 'totalValor'),
}

export const solicitacoesDB = {
  list:           (obraId?: string): Promise<ResSolicitacao[]> => rpc('solicitacoes', 'list', obraId),
  insert:         (data: Omit<ResSolicitacao, 'id' | 'criado_em' | 'obra_nome' | 'tipo_nome' | 'data_finalizacao'>): Promise<ResSolicitacao> =>
    rpc('solicitacoes', 'insert', data),
  updateStatus:   (id: string, status: ResSolicitacao['status']): Promise<void> =>
    rpc('solicitacoes', 'updateStatus', id, status),
  delete:         (id: string): Promise<void>                   => rpc('solicitacoes', 'delete', id),
  countPendentes: (): Promise<number>                            => rpc('solicitacoes', 'countPendentes'),
}

export const alertasDB = {
  list:        (): Promise<ResAlerta[]>   => rpc('alertas', 'list'),
  upsert:      (obraId: string, tipoId: string, minimo: number, emails?: string): Promise<void> =>
    rpc('alertas', 'upsert', obraId, tipoId, minimo, emails),
  toggleAtivo: (id: string): Promise<void> => rpc('alertas', 'toggleAtivo', id),
  delete:      (id: string): Promise<void> => rpc('alertas', 'delete', id),
}
