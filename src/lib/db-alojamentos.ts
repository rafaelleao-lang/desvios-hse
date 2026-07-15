import type { Alojamento, AlojamentoItem, AlojamentoItemKey, AlojamentoItemStats, AlojamentoLocal, AlojamentoSubUnidade, FotoAlojamento } from '@/types/alojamentos'

// ── Cliente RPC para o backend MySQL (módulo Alojamentos) ──────────────────────
async function rpc<T>(resource: string, action: string, ...args: unknown[]): Promise<T> {
  const res = await fetch('/api/alojamentos', {
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

export interface CreateAlojamentoItemInput {
  item_key: AlojamentoItemKey
  ordem: number
  conforme: boolean
  observacao?: string
  fotos: FotoAlojamento[]
  sub_unidades?: AlojamentoSubUnidade[]
}

export type CreateAlojamentoInput = Omit<
  Alojamento, 'id' | 'numero' | 'criado_em' | 'atualizado_em' | 'itens' | 'total_itens' | 'total_conformes'
>

export const alojamentosDB = {
  list: (filters?: { obra_id?: string; data_inicio?: string; data_fim?: string }): Promise<Alojamento[]> =>
    rpc('alojamentos', 'list', filters),
  find: (id: string): Promise<(Alojamento & { itens: AlojamentoItem[] }) | undefined> =>
    rpc('alojamentos', 'find', id),
  create: (data: CreateAlojamentoInput, itens: CreateAlojamentoItemInput[]): Promise<Alojamento & { itens: AlojamentoItem[] }> =>
    rpc('alojamentos', 'create', data, itens),
  delete: (id: string): Promise<void> => rpc('alojamentos', 'delete', id),
  statsPorItem: (): Promise<AlojamentoItemStats[]> => rpc('alojamentos', 'statsPorItem'),
}

export const alojamentoLocaisDB = {
  list: (filters?: { obra_id?: string }): Promise<AlojamentoLocal[]> =>
    rpc('alojamento_locais', 'list', filters),
  find: (id: string): Promise<AlojamentoLocal | undefined> => rpc('alojamento_locais', 'find', id),
  create: (data: { obra_id: string; obra_nome?: string; endereco: string }): Promise<AlojamentoLocal> =>
    rpc('alojamento_locais', 'create', data),
  update: (id: string, data: { obra_id?: string; obra_nome?: string; endereco?: string }): Promise<AlojamentoLocal | undefined> =>
    rpc('alojamento_locais', 'update', id, data),
  delete: (id: string): Promise<void> => rpc('alojamento_locais', 'delete', id),
}
