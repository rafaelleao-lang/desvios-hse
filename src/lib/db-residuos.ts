import type {
  TipoResiduo, Fornecedor, Saldo, Retirada, Solicitacao, AlertaEstoque, SaldoObra,
} from '@/types/residuos'

async function rpcResiduos<T>(resource: string, action: string, ...args: unknown[]): Promise<T> {
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

// ── Tipos de resíduo ──────────────────────────────────────────────────────────
export const tiposDB = {
  list: (): Promise<TipoResiduo[]> => rpcResiduos('tipos', 'list'),
  find: (id: string): Promise<TipoResiduo | undefined> => rpcResiduos('tipos', 'find', id),
  create: (data: Omit<TipoResiduo, 'id' | 'created_at'>): Promise<TipoResiduo> =>
    rpcResiduos('tipos', 'create', data),
  update: (id: string, data: Partial<Omit<TipoResiduo, 'id' | 'created_at'>>): Promise<void> =>
    rpcResiduos('tipos', 'update', id, data),
  delete: (id: string): Promise<void> => rpcResiduos('tipos', 'delete', id),
}

// ── Fornecedores ──────────────────────────────────────────────────────────────
export const fornecedoresResiduosDB = {
  list: (): Promise<Fornecedor[]> => rpcResiduos('fornecedores', 'list'),
  find: (id: string): Promise<Fornecedor | undefined> => rpcResiduos('fornecedores', 'find', id),
  create: (data: Omit<Fornecedor, 'id' | 'created_at' | 'precos'>): Promise<Fornecedor> =>
    rpcResiduos('fornecedores', 'create', data),
  update: (id: string, data: Partial<Omit<Fornecedor, 'id' | 'created_at' | 'precos'>>): Promise<void> =>
    rpcResiduos('fornecedores', 'update', id, data),
  toggleStatus: (id: string): Promise<void> => rpcResiduos('fornecedores', 'toggleStatus', id),
  delete: (id: string): Promise<void> => rpcResiduos('fornecedores', 'delete', id),
  setPrecos: (fornecedorId: string, precos: Array<{ residuo_id: string; descricao?: string; valor: number }>): Promise<void> =>
    rpcResiduos('fornecedores', 'setPrecos', fornecedorId, precos),
}

// ── Saldos (entradas) ─────────────────────────────────────────────────────────
export const saldosDB = {
  list: (obraId?: string): Promise<Saldo[]> => rpcResiduos('saldos', 'list', obraId),
  insert: (data: Omit<Saldo, 'id' | 'created_at' | 'obra_nome' | 'residuo_nome'>): Promise<Saldo> =>
    rpcResiduos('saldos', 'insert', data),
  delete: (id: string): Promise<void> => rpcResiduos('saldos', 'delete', id),
  saldosPorObra: (): Promise<SaldoObra[]> => rpcResiduos('saldos', 'saldosPorObra'),
}

// ── Retiradas ─────────────────────────────────────────────────────────────────
export const retiradasDB = {
  list: (obraId?: string): Promise<Retirada[]> => rpcResiduos('retiradas', 'list', obraId),
  insert: (data: Omit<Retirada, 'id' | 'created_at' | 'obra_nome' | 'residuo_nome' | 'fornecedor_nome'>): Promise<Retirada> =>
    rpcResiduos('retiradas', 'insert', data),
  delete: (id: string): Promise<void> => rpcResiduos('retiradas', 'delete', id),
  totalValorRetiradas: (): Promise<number> => rpcResiduos('retiradas', 'totalValorRetiradas'),
}

// ── Solicitações ──────────────────────────────────────────────────────────────
export const solicitacoesDB = {
  list: (obraId?: string): Promise<Solicitacao[]> => rpcResiduos('solicitacoes', 'list', obraId),
  insert: (data: Omit<Solicitacao, 'id' | 'created_at' | 'obra_nome' | 'residuo_nome' | 'data_finalizacao'>): Promise<Solicitacao> =>
    rpcResiduos('solicitacoes', 'insert', data),
  updateStatus: (id: string, status: Solicitacao['status']): Promise<void> =>
    rpcResiduos('solicitacoes', 'updateStatus', id, status),
  delete: (id: string): Promise<void> => rpcResiduos('solicitacoes', 'delete', id),
  countPendentes: (): Promise<number> => rpcResiduos('solicitacoes', 'countPendentes'),
}

// ── Alertas ───────────────────────────────────────────────────────────────────
export const alertasDB = {
  list: (): Promise<AlertaEstoque[]> => rpcResiduos('alertas', 'list'),
  upsert: (obraId: string, residuoId: string, minimo: number, emails?: string): Promise<void> =>
    rpcResiduos('alertas', 'upsert', obraId, residuoId, minimo, emails),
  toggleAtivo: (id: string): Promise<void> => rpcResiduos('alertas', 'toggleAtivo', id),
  delete: (id: string): Promise<void> => rpcResiduos('alertas', 'delete', id),
}
